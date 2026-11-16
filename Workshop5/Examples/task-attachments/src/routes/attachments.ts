import type { FastifyPluginAsync } from 'fastify'

import { randomUUID } from 'node:crypto'

import {
    mkdir,
    chmod,
    open,
    rename,
    stat,
    unlink
} from 'node:fs/promises'

import {
    basename,
    extname,
    join,
    resolve
} from 'node:path'

import { pipeline } from 'node:stream/promises'

import { Writable } from 'node:stream'

import { fileTypeFromFile } from 'file-type'

import { MAX_ATTACHMENT_SIZE } from '../config/uploads.js'


// Storage configuration

const UPLOAD_ROOT = resolve(
    process.env.UPLOAD_DIR ?? './var/uploads'
)

const STAGING_DIR = join(
    UPLOAD_ROOT,
    'staging'
)

const OBJECTS_DIR = join(
    UPLOAD_ROOT,
    'objects'
)


// Supported extensions and their expected MIME types

const ALLOWED_EXTENSIONS: Record<string, string> = {

    '.jpg': 'image/jpeg',

    '.jpeg': 'image/jpeg',

    '.png': 'image/png',

    '.pdf': 'application/pdf'

}


// Convert detected MIME types into server-controlled extensions

const MIME_EXTENSIONS: Record<string, string> = {

    'image/jpeg': 'jpg',

    'image/png': 'png',

    'application/pdf': 'pdf'

}


// Route parameter types

type TaskParams = {
    taskId: number
}

type AttachmentParams = {
    attachmentId: number
}


// Sanitize the original filename for metadata storage

function sanitizeOriginalName(filename: string): string {

    const name = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (name || 'upload').slice(0, 255)

}


// Validate database identifiers

const taskIdSchema = {

    type: 'object',

    properties: {

        taskId: {

            type: 'integer',

            minimum: 1,

            maximum: 2147483647

        }

    },

    required: ['taskId'],

    additionalProperties: false

} as const


const attachmentIdSchema = {

    type: 'object',

    properties: {

        attachmentId: {

            type: 'integer',

            minimum: 1,

            maximum: 2147483647

        }

    },

    required: ['attachmentId'],

    additionalProperties: false

} as const


const attachmentResponseSchema = {

    type: 'object',

    properties: {

        id: {
            type: 'integer'
        },

        taskId: {
            type: 'integer'
        },

        originalName: {
            type: 'string'
        },

        mimeType: {
            type: 'string'
        },

        extension: {
            type: 'string'
        },

        size: {
            type: 'integer'
        },

        createdAt: {
            type: 'string',
            format: 'date-time'
        }

    },

    required: [

        'id',

        'taskId',

        'originalName',

        'mimeType',

        'extension',

        'size',

        'createdAt'

    ],

    additionalProperties: false

} as const


const attachmentsRoutes: FastifyPluginAsync = async (fastify) => {


    // Create private storage directories

    await mkdir(STAGING_DIR, {

        recursive: true,

        mode: 0o700

    })

    await mkdir(OBJECTS_DIR, {

        recursive: true,

        mode: 0o700

    })

    await chmod(STAGING_DIR, 0o700)

    await chmod(OBJECTS_DIR, 0o700)



    // Upload a task attachment

    fastify.post<{ Params: TaskParams }>(

        '/tasks/:taskId/attachments',

        {

            preHandler: [

                fastify.authenticate

            ],

            config: {

                rateLimit: {

                    max: 20,

                    timeWindow: '1 hour'

                }

            },

            schema: {

                params: taskIdSchema,

                response: {

                    201: attachmentResponseSchema

                }

            }

        },

        async (request, reply) => {


            // Retrieve the authenticated user

            const user = request.currentUser!


            // Verify task ownership before consuming the file

            const task = await fastify.prisma.task.findFirst({

                where: {

                    id: request.params.taskId,

                    ...(user.role === 'ADMIN'

                        ? {}

                        : { createdById: user.id })

                },

                select: {

                    id: true

                }

            })


            if (!task) {

                return reply.code(404).send({

                    error: 'Task not found'

                })

            }


            // Ensure the request uses multipart/form-data

            if (!request.isMultipart()) {

                return reply.code(415).send({

                    error: 'Expected multipart/form-data'

                })

            }


            // Retrieve the uploaded file

            const part = await request.file({

                throwFileSizeLimit: false

            })


            if (!part) {

                return reply.code(400).send({

                    error: 'No file was provided'

                })

            }


            // Only accept the expected multipart field

            if (part.fieldname !== 'file') {

                // Consume the stream before returning

                await pipeline(

                    part.file,

                    new Writable({

                        write(_chunk, _encoding, callback) {

                            callback()

                        }

                    })

                )

                return reply.code(400).send({

                    error: 'The file field must be named "file"'

                })

            }


            // Generate server-controlled identifiers

            const storageKey = randomUUID()

            const stagingPath = join(

                STAGING_DIR,

                `${storageKey}.part`

            )

            const objectPath = join(

                OBJECTS_DIR,

                storageKey

            )


            let stagingFileCreated = false

            let objectFileCreated = false

            let metadataCreated = false


            try {


                // Create the temporary file without overwriting existing files

                const handle = await open(

                    stagingPath,

                    'wx',

                    0o600

                )

                stagingFileCreated = true


                // Stream the uploaded content to temporary storage

                await pipeline(

                    part.file,

                    handle.createWriteStream({

                        autoClose: true

                    })

                )


                // Check whether the multipart file was truncated

                if (part.file.truncated) {

                    return reply.code(413).send({

                        error: 'File exceeds the maximum allowed size'

                    })

                }


                // Inspect the stored file size

                const fileStats = await stat(stagingPath)


                if (fileStats.size === 0) {

                    return reply.code(400).send({

                        error: 'Empty files are not allowed'

                    })

                }


                if (fileStats.size > MAX_ATTACHMENT_SIZE) {

                    return reply.code(413).send({

                        error: 'File exceeds the maximum allowed size'

                    })

                }


                // Sanitize the original filename

                const originalName = sanitizeOriginalName(

                    part.filename

                )


                // Check the original extension against our allowlist

                const extension = extname(

                    originalName

                ).toLowerCase()


                const expectedMime = ALLOWED_EXTENSIONS[extension]


                if (!expectedMime) {

                    return reply.code(415).send({

                        error: 'Unsupported file extension'

                    })

                }


                // Detect the actual file format from its binary signature

                const detected = await fileTypeFromFile(

                    stagingPath,

                    {

                        maxBufferSize: 64 * 1024

                    }

                )


                if (!detected || detected.mime !== expectedMime) {

                    return reply.code(415).send({

                        error: 'File content does not match the allowed format'

                    })

                }


                // Compare the client-provided MIME type when available

                if (

                    part.mimetype !== 'application/octet-stream' &&

                    part.mimetype !== detected.mime

                ) {

                    return reply.code(415).send({

                        error: 'Declared MIME type does not match the file content'

                    })

                }


                // Determine the extension from the detected file type

                const detectedExtension = MIME_EXTENSIONS[

                    detected.mime

                ]


                if (!detectedExtension) {

                    return reply.code(415).send({

                        error: 'Unsupported file format'

                    })

                }


                // Move the validated file into private object storage

                await rename(

                    stagingPath,

                    objectPath

                )

                stagingFileCreated = false

                objectFileCreated = true


                // Save file metadata in PostgreSQL

                const attachment = await fastify.prisma.attachment.create({

                    data: {

                        taskId: task.id,

                        uploadedById: user.id,

                        originalName,

                        storageKey,

                        mimeType: detected.mime,

                        extension: detectedExtension,

                        size: Number(fileStats.size)

                    },

                    select: {

                        id: true,

                        taskId: true,

                        originalName: true,

                        mimeType: true,

                        extension: true,

                        size: true,

                        createdAt: true

                    }

                })


                metadataCreated = true


                // Return public attachment metadata

                return reply.code(201).send(attachment)

            } finally {


                // Remove any remaining temporary file

                if (stagingFileCreated) {

                    await unlink(stagingPath).catch(() => {})

                }


                // Remove stored content if database persistence failed

                if (objectFileCreated && !metadataCreated) {

                    await unlink(objectPath).catch(() => {})

                }

            }

        }

    )



    // Retrieve attachments belonging to a task

    fastify.get<{ Params: TaskParams }>(

        '/tasks/:taskId/attachments',

        {

            preHandler: [

                fastify.authenticate

            ],

            schema: {

                params: taskIdSchema

            }

        },

        async (request, reply) => {


            const user = request.currentUser!


            const task = await fastify.prisma.task.findFirst({

                where: {

                    id: request.params.taskId,

                    ...(user.role === 'ADMIN'

                        ? {}

                        : { createdById: user.id })

                },

                select: {

                    id: true

                }

            })


            if (!task) {

                return reply.code(404).send({

                    error: 'Task not found'

                })

            }


            return fastify.prisma.attachment.findMany({

                where: {

                    taskId: task.id

                },

                select: {

                    id: true,

                    taskId: true,

                    originalName: true,

                    mimeType: true,

                    extension: true,

                    size: true,

                    createdAt: true

                },

                orderBy: {

                    createdAt: 'desc'

                }

            })

        }

    )



    // Download an attachment

    fastify.get<{ Params: AttachmentParams }>(

        '/attachments/:attachmentId/download',

        {

            preHandler: [

                fastify.authenticate

            ],

            schema: {

                params: attachmentIdSchema

            }

        },

        async (request, reply) => {


            const user = request.currentUser!


            // Retrieve only attachments the user is authorized to access

            const attachment = await fastify.prisma.attachment.findFirst({

                where: {

                    id: request.params.attachmentId,

                    ...(user.role === 'ADMIN'

                        ? {}

                        : {

                            task: {

                                is: {

                                    createdById: user.id

                                }

                            }

                        })

                }

            })


            if (!attachment) {

                return reply.code(404).send({

                    error: 'Attachment not found'

                })

            }


            // Verify the internal storage identifier

            if (

                !/^[0-9a-f-]{36}$/i.test(

                    attachment.storageKey

                )

            ) {

                throw new Error('Invalid internal storage identifier')

            }


            const filePath = join(

                OBJECTS_DIR,

                attachment.storageKey

            )


            // Open the stored file

            let handle

            try {

                handle = await open(filePath, 'r')

            } catch (error) {

                if (

                    typeof error === 'object' &&

                    error !== null &&

                    'code' in error &&

                    error.code === 'ENOENT'

                ) {

                    return reply.code(404).send({

                        error: 'Attachment content not found'

                    })

                }

                throw error

            }


            // Always force download rather than rendering user content

            return reply

                .header(

                    'Content-Type',

                    'application/octet-stream'

                )

                .header(

                    'Content-Disposition',

                    `attachment; filename="attachment-${attachment.id}.${attachment.extension}"`

                )

                .header(

                    'X-Content-Type-Options',

                    'nosniff'

                )

                .header(

                    'Cache-Control',

                    'private, no-store'

                )

                .header(

                    'Content-Length',

                    String(attachment.size)

                )

                .send(

                    handle.createReadStream({

                        autoClose: true

                    })

                )

        }

    )



    // Delete an attachment

    fastify.delete<{ Params: AttachmentParams }>(

        '/attachments/:attachmentId',

        {

            preHandler: [

                fastify.authenticate

            ],

            schema: {

                params: attachmentIdSchema

            }

        },

        async (request, reply) => {


            const user = request.currentUser!


            const attachment = await fastify.prisma.attachment.findFirst({

                where: {

                    id: request.params.attachmentId,

                    ...(user.role === 'ADMIN'

                        ? {}

                        : {

                            task: {

                                is: {

                                    createdById: user.id

                                }

                            }

                        })

                },

                select: {

                    id: true,

                    storageKey: true

                }

            })


            if (!attachment) {

                return reply.code(404).send({

                    error: 'Attachment not found'

                })

            }


            const filePath = join(

                OBJECTS_DIR,

                attachment.storageKey

            )


            // Remove the physical file

            try {

                await unlink(filePath)

            } catch (error) {

                if (

                    typeof error === 'object' &&

                    error !== null &&

                    'code' in error &&

                    error.code !== 'ENOENT'

                ) {

                    throw error

                }

            }


            // Remove the corresponding database record

            await fastify.prisma.attachment.delete({

                where: {

                    id: attachment.id

                }

            })


            return reply.code(204).send()

        }

    )

}

export default attachmentsRoutes
