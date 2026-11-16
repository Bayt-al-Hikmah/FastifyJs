import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyRequest
} from 'fastify'

import { randomUUID } from 'node:crypto'

import { open, rename, stat } from 'node:fs/promises'

import { pipeline } from 'node:stream/promises'


import {
    ALLOWED_FIELD_NAMES,
    MAX_ATTACHMENT_SIZE,
    MAX_FILES_PER_REQUEST,
    USER_STORAGE_QUOTA_BYTES,
    MAX_ATTACHMENTS_PER_TASK
} from '../config/uploads.js'

import { STORAGE_KEY_PATTERN } from '../config/storage.js'

import {
    AttachmentRequestError,
    sanitizeOriginalName,
    validateStagedFile
} from '../lib/attachment-validation.js'

import {
    drainFileStream,
    objectPathFor,
    removeFilesQuietly,
    stagingPathFor
} from '../lib/storage-files.js'

import type { AuthenticatedUser } from '../types/auth.js'


type TaskParams = {
    taskId: number
}

type AttachmentParams = {
    attachmentId: number
}

type UploadedPart = NonNullable<
    Awaited<ReturnType<FastifyRequest['file']>>
>

type NewAttachment = {

    taskId: number

    uploadedById: number

    originalName: string

    storageKey: string

    mimeType: string

    extension: string

    size: number

}


const attachmentSelect = {

    id: true,

    taskId: true,

    originalName: true,

    mimeType: true,

    extension: true,

    size: true,

    createdAt: true

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


const uploadResponseSchema = {

    type: 'object',

    properties: {

        attachments: {

            type: 'array',

            items: attachmentResponseSchema

        }

    },

    required: ['attachments'],

    additionalProperties: false

} as const


const taskIdSchema = {

    type: 'object',

    properties: {

        taskId: {

            type: 'integer',

            minimum: 1,

            maximum: 2_147_483_647

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

            maximum: 2_147_483_647

        }

    },

    required: ['attachmentId'],

    additionalProperties: false

} as const


const attachmentsRoutes: FastifyPluginAsync = async (fastify) => {

    // Upload one or more files to an owned task.

    fastify.post<{ Params: TaskParams }>(

        '/tasks/:taskId/attachments',

        {

            preHandler: [
                fastify.authenticate
            ],

            config: {

                rateLimit: {
                    max: 30,
                    timeWindow: '1 hour'
                }

            },

            schema: {

                params: taskIdSchema,

                response: {

                    201: uploadResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!


            // Authorize before reading the body so another user's task is
            // rejected without buffering or storing any uploaded content.

            const task = await findAccessibleTask(
                fastify,
                request.params.taskId,
                user
            )


            if (!task) {

                return reply.code(404).send({
                    error: 'Task not found'
                })

            }


            if (!request.isMultipart()) {

                return reply.code(415).send({
                    error: 'Expected multipart/form-data'
                })

            }


            const stagedFiles = new Set<string>()

            const storedFiles = new Set<string>()

            const currentTaskAttachmentsCount = await fastify.prisma.attachment.count({
                where: { taskId: task.id }
            })

            if (currentTaskAttachmentsCount >= MAX_ATTACHMENTS_PER_TASK) {
                return reply.code(409).send({
                    error: "Maximum attachments per task (" + MAX_ATTACHMENTS_PER_TASK + ") reached"
                })
            }

            const storageUsage = await fastify.prisma.attachment.aggregate({
                where: { uploadedById: user.id },
                _sum: { size: true }
            })
            const currentUsedBytes = storageUsage._sum.size ?? 0
            let projectedUsedBytes = currentUsedBytes

            const metadata: NewAttachment[] = []


            let failure: AttachmentRequestError | null = null

            let processedFiles = 0


            try {

                for await (const part of request.files()) {

                    processedFiles += 1


                    // After the first failure we stop storing files but
                    // continue draining the remaining parts so the multipart
                    // parser can finish cleanly.

                    if (failure) {

                        await drainFileStream(part.file)

                        continue

                    }


                    try {

                        if (currentTaskAttachmentsCount + processedFiles > MAX_ATTACHMENTS_PER_TASK) {
                            throw new AttachmentRequestError(
                                409,
                                'TASK_ATTACHMENT_LIMIT_EXCEEDED',
                                'This upload would exceed the limit of ' + MAX_ATTACHMENTS_PER_TASK + ' attachments per task'
                            )
                        }

                        if (!ALLOWED_FIELD_NAMES.has(part.fieldname)) {

                            throw new AttachmentRequestError(
                                400,
                                'UNEXPECTED_FIELD',
                                'Upload files using the "files" field'
                            )

                        }


                        if (metadata.length >= MAX_FILES_PER_REQUEST) {

                            throw new AttachmentRequestError(
                                400,
                                'TOO_MANY_FILES',
                                `A request may contain at most ${MAX_FILES_PER_REQUEST} files`
                            )

                        }


                        await storePart(
                            part,
                            task.id,
                            user.id,
                            stagedFiles,
                            storedFiles,
                            metadata
                        )

                    } catch (error) {

                        failure = toAttachmentError(error)

                        request.log.warn(
                            {
                                err: error,
                                taskId: task.id
                            },
                            'Attachment upload rejected'
                        )

                        await drainFileStream(part.file)

                    }

                }

            } catch (error) {

                if (!failure) {

                    failure = toAttachmentError(error)

                }

                request.log.warn(
                    {
                        err: error,
                        taskId: task.id
                    },
                    'Multipart upload failed'
                )

            }


            if (!failure && processedFiles === 0) {

                failure = new AttachmentRequestError(
                    400,
                    'NO_FILES',
                    'No files were provided'
                )

            }


            if (failure) {

                await removeFilesQuietly(stagedFiles)

                await removeFilesQuietly(storedFiles)


                return reply.code(failure.statusCode).send({
                    error: failure.message,
                    code: failure.code
                })

            }


            try {

                // PostgreSQL inserts all metadata in one statement. If it
                // fails, every object written during this request is removed.

                const attachments =
                    await fastify.prisma.attachment.createManyAndReturn({

                        data: metadata,

                        select: attachmentSelect

                    })


                return reply.code(201).send({
                    attachments
                })

            } catch (error) {

                request.log.error(
                    {
                        err: error,
                        taskId: task.id
                    },
                    'Failed to persist attachment metadata'
                )


                await removeFilesQuietly(stagedFiles)

                await removeFilesQuietly(storedFiles)


                return reply.code(500).send({
                    error: 'Failed to save attachment metadata',
                    code: 'ATTACHMENT_PERSIST_FAILED'
                })

            }

        }

    )


    // List the attachments of an owned task.

    fastify.get<{ Params: TaskParams }>(

        '/tasks/:taskId/attachments',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: taskIdSchema,

                response: {

                    200: {

                        type: 'array',

                        items: attachmentResponseSchema

                    }

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!


            const task = await findAccessibleTask(
                fastify,
                request.params.taskId,
                user
            )


            if (!task) {

                return reply.code(404).send({
                    error: 'Task not found'
                })

            }


            return fastify.prisma.attachment.findMany({

                where: {
                    taskId: task.id
                },

                select: attachmentSelect,

                orderBy: {
                    createdAt: 'desc'
                }

            })

        }

    )


    // Stream a private attachment after an explicit authorization check.

    fastify.get<{ Params: AttachmentParams }>(

        '/attachments/:attachmentId/download',

        {

            preHandler: [
                fastify.authenticate
            ],

            config: {

                rateLimit: {
                    max: 240,
                    timeWindow: '1 minute'
                }

            },

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

                    storageKey: true,

                    extension: true,

                    size: true

                }

            })


            if (!attachment) {

                return reply.code(404).send({
                    error: 'Attachment not found'
                })

            }


            if (!STORAGE_KEY_PATTERN.test(attachment.storageKey)) {

                throw new Error('Invalid internal storage identifier')

            }


            let handle

            try {

                handle = await open(
                    objectPathFor(attachment.storageKey),
                    'r'
                )

            } catch (error) {

                if (isMissingFileError(error)) {

                    return reply.code(404).send({
                        error: 'Attachment content not found'
                    })

                }

                throw error

            }


            // Never render user content inline. The download filename is
            // generated from server-controlled values, not the original name.

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


    // Delete one attachment and its private object.

    fastify.delete<{ Params: AttachmentParams }>(

        '/attachments/:attachmentId',

        {

            preHandler: [
                fastify.authenticate
            ],

            config: {

                rateLimit: {
                    max: 60,
                    timeWindow: '1 minute'
                }

            },

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


            if (!STORAGE_KEY_PATTERN.test(attachment.storageKey)) {

                throw new Error('Invalid internal storage identifier')

            }


            try {

                await fastify.prisma.attachment.delete({

                    where: {
                        id: attachment.id
                    }

                })

            } catch (error) {

                request.log.error(
                    {
                        err: error,
                        attachmentId: attachment.id
                    },
                    'Failed to delete attachment metadata'
                )


                return reply.code(500).send({
                    error: 'Failed to delete attachment'
                })

            }


            // The database row is gone first. If the filesystem removal fails
            // the orphan is harmless and can be reconciled by a cleanup job.

            await removeFilesQuietly([
                objectPathFor(attachment.storageKey)
            ])


            return reply.code(204).send()

        }

    )


    fastify.get(
        '/users/me/storage-quota',
        {
            preHandler: [
                fastify.authenticate
            ]
        },
        async (request) => {
            const user = request.currentUser!
            const usage = await fastify.prisma.attachment.aggregate({
                where: { uploadedById: user.id },
                _sum: { size: true },
                _count: { id: true }
            })
            const usedBytes = usage._sum.size ?? 0
            return {
                usedBytes,
                usedMb: Math.round((usedBytes / (1024 * 1024)) * 100) / 100,
                quotaBytes: USER_STORAGE_QUOTA_BYTES,
                quotaMb: Math.round(USER_STORAGE_QUOTA_BYTES / (1024 * 1024)),
                remainingBytes: Math.max(0, USER_STORAGE_QUOTA_BYTES - usedBytes),
                attachmentCount: usage._count.id,
                maxAttachmentsPerTask: MAX_ATTACHMENTS_PER_TASK
            }
        }
    )

}


async function findAccessibleTask(
    fastify: FastifyInstance,
    taskId: number,
    user: AuthenticatedUser
): Promise<{ id: number } | null> {

    return fastify.prisma.task.findFirst({

        where: {

            id: taskId,

            ...(user.role === 'ADMIN'
                ? {}
                : { createdById: user.id })

        },

        select: {
            id: true
        }

    })

}


async function storePart(
    part: UploadedPart,
    taskId: number,
    userId: number,
    stagedFiles: Set<string>,
    storedFiles: Set<string>,
    metadata: NewAttachment[]
): Promise<void> {

    const storageKey = randomUUID()

    const stagingPath = stagingPathFor(storageKey)

    const objectPath = objectPathFor(storageKey)


    // Track the path before writing so a failed pipeline is still cleaned up.

    stagedFiles.add(stagingPath)


    const handle = await open(
        stagingPath,
        'wx',
        0o600
    )


    try {

        await pipeline(
            part.file,
            handle.createWriteStream({
                autoClose: true
            })
        )

    } catch (error) {

        await handle.close().catch(() => undefined)

        throw error

    }


    if (part.file.truncated) {

        throw new AttachmentRequestError(
            413,
            'FILE_TOO_LARGE',
            `Each file must be ${formatMegabytes(MAX_ATTACHMENT_SIZE)} or smaller`
        )

    }


    const fileStats = await stat(stagingPath)


    if (fileStats.size === 0) {

        throw new AttachmentRequestError(
            400,
            'EMPTY_FILE',
            'Empty files are not allowed'
        )

    }


    if (fileStats.size > MAX_ATTACHMENT_SIZE) {

        throw new AttachmentRequestError(
            413,
            'FILE_TOO_LARGE',
            `Each file must be ${formatMegabytes(MAX_ATTACHMENT_SIZE)} or smaller`
        )

    }


    const originalName = sanitizeOriginalName(part.filename)


    const validated = await validateStagedFile(
        stagingPath,
        originalName,
        part.mimetype
    )


    await rename(
        stagingPath,
        objectPath
    )


    stagedFiles.delete(stagingPath)

    storedFiles.add(objectPath)


    metadata.push({

        taskId,

        uploadedById: userId,

        originalName,

        storageKey,

        mimeType: validated.mimeType,

        extension: validated.extension,

        size: Number(fileStats.size)

    })

}


function toAttachmentError(error: unknown): AttachmentRequestError {

    if (error instanceof AttachmentRequestError) {
        return error
    }


    const code = getErrorCode(error)


    if (code === 'FST_REQ_FILE_TOO_LARGE') {

        return new AttachmentRequestError(
            413,
            'FILE_TOO_LARGE',
            `Each file must be ${formatMegabytes(MAX_ATTACHMENT_SIZE)} or smaller`
        )

    }


    if (code === 'FST_FILES_LIMIT' || code === 'FST_PARTS_LIMIT') {

        return new AttachmentRequestError(
            400,
            'TOO_MANY_FILES',
            `A request may contain at most ${MAX_FILES_PER_REQUEST} files`
        )

    }


    if (
        code === 'FST_FIELDS_LIMIT' ||
        code === 'FST_INVALID_MULTIPART_CONTENT_TYPE'
    ) {

        return new AttachmentRequestError(
            400,
            'INVALID_MULTIPART_REQUEST',
            'The multipart request is not valid'
        )

    }


    return new AttachmentRequestError(
        500,
        'UPLOAD_FAILED',
        'The uploaded file could not be processed'
    )

}


function getErrorCode(error: unknown): string | undefined {

    if (typeof error !== 'object' || error === null) {
        return undefined
    }

    const code = (error as { code?: unknown }).code

    return typeof code === 'string'
        ? code
        : undefined

}


function isMissingFileError(error: unknown): boolean {

    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
    )

}


function formatMegabytes(bytes: number): string {

    return `${Math.round(bytes / (1024 * 1024))} MB`

}


export default attachmentsRoutes
