import { randomUUID } from 'node:crypto'

import {
    chmod,
    mkdir,
    open,
    rename,
    stat,
    unlink
} from 'node:fs/promises'

import { join } from 'node:path'

import { pipeline } from 'node:stream/promises'
import { Readable, Writable } from 'node:stream'

import type {
    FastifyPluginAsync,
    FastifyReply
} from 'fastify'

import {
    MAX_UPLOAD_BYTES,
    OBJECTS_DIR,
    STAGING_DIR
} from '../config/uploads.js'

import {
    buildContentDisposition,
    sanitizeOriginalName,
    validateStoredFile
} from '../lib/file-validation.js'

import {
    createUploadRecord,
    findUpload,
    listUploads,
    removeUpload,
    toUploadApi
} from '../lib/upload-store.js'

import { UploadMeter } from '../lib/upload-meter.js'
import { UploadRejection } from '../lib/upload-errors.js'

type UploadParams = {
    id: string
}

const uploadIdSchema = {
    type: 'object',

    properties: {
        id: {
            type: 'string',
            pattern:
                '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        }
    },

    required: ['id'],

    additionalProperties: false
} as const

const uploadErrorSchema = {
    type: 'object',

    properties: {
        error: { type: 'string' },
        code: { type: 'string' }
    },

    required: ['error'],

    additionalProperties: false
} as const

const uploadSchema = {
    type: 'object',

    properties: {
        id: { type: 'string' },
        originalName: { type: 'string' },
        mimeType: { type: 'string' },
        extension: { type: 'string' },
        size: { type: 'integer' },
        sha256: { type: 'string' },
        createdAt: {
            type: 'string',
            format: 'date-time'
        },
        downloadUrl: { type: 'string' }
    },

    required: [
        'id',
        'originalName',
        'mimeType',
        'extension',
        'size',
        'sha256',
        'createdAt',
        'downloadUrl'
    ],

    additionalProperties: false
} as const

function sendUploadError(
    reply: FastifyReply,
    error: UploadRejection
): FastifyReply {
    return reply.code(error.statusCode).send({
        error: error.message,
        code: error.code
    })
}

async function drainStream(stream: Readable): Promise<void> {
    await pipeline(
        stream,
        new Writable({
            write(_chunk, _encoding, callback) {
                callback()
            }
        })
    )
}

const apiRoutes: FastifyPluginAsync = async (fastify) => {
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

    fastify.post(
        '/uploads',
        {
            schema: {
                response: {
                    201: uploadSchema,
                    400: uploadErrorSchema,
                    413: uploadErrorSchema,
                    415: uploadErrorSchema,
                    500: uploadErrorSchema
                }
            }
        },
        async (request, reply) => {
            if (!request.isMultipart()) {
                return reply.code(415).send({
                    error: 'Expected multipart/form-data.',
                    code: 'not-multipart'
                })
            }

            const part = await request.file({
                throwFileSizeLimit: false
            })

            if (!part) {
                return reply.code(400).send({
                    error: 'No file was provided.',
                    code: 'missing-file'
                })
            }

            if (part.fieldname !== 'file') {
                await drainStream(part.file).catch(() => {})

                return reply.code(400).send({
                    error: 'The multipart field must be named "file".',
                    code: 'wrong-field'
                })
            }

            const storageKey = randomUUID()
            const stagingPath = join(STAGING_DIR, `${storageKey}.part`)
            const objectPath = join(OBJECTS_DIR, storageKey)

            let stagingFileExists = false
            let objectFileExists = false
            let metadataSaved = false

            try {
                const handle = await open(stagingPath, 'wx', 0o600)
                stagingFileExists = true

                const meter = new UploadMeter(MAX_UPLOAD_BYTES)

                // The uploaded stream flows through the meter and straight to
                // disk. Only one chunk (plus the meter's buffer) is in memory.
                await pipeline(
                    part.file,
                    meter,
                    handle.createWriteStream({
                        autoClose: true
                    })
                )

                if (part.file.truncated) {
                    throw new UploadRejection(
                        'too-large',
                        'The parser stopped the stream at the hard limit.',
                        413
                    )
                }

                const fileStats = await stat(stagingPath)

                if (fileStats.size === 0) {
                    throw new UploadRejection(
                        'empty-file',
                        'Empty uploads are not accepted.',
                        400
                    )
                }

                if (fileStats.size > MAX_UPLOAD_BYTES) {
                    throw new UploadRejection(
                        'too-large',
                        'The stored file exceeds the 10 MB limit.',
                        413
                    )
                }

                const originalName = sanitizeOriginalName(part.filename)

                const validated = await validateStoredFile(
                    stagingPath,
                    originalName,
                    part.mimetype
                )

                const sha256 = meter.digestSha256()

                await rename(stagingPath, objectPath)
                stagingFileExists = false
                objectFileExists = true

                const record = createUploadRecord({
                    originalName,
                    storageKey,
                    mimeType: validated.mimeType,
                    extension: validated.extension,
                    size: fileStats.size,
                    sha256
                })

                metadataSaved = true

                return reply.code(201).send(toUploadApi(record))
            } catch (error) {
                if (error instanceof UploadRejection) {
                    return sendUploadError(reply, error)
                }

                request.log.error(
                    {
                        err: error
                    },
                    'Streaming upload failed'
                )

                return reply.code(500).send({
                    error: 'The upload could not be completed.',
                    code: 'upload-failed'
                })
            } finally {
                if (stagingFileExists) {
                    await unlink(stagingPath).catch(() => {})
                }

                if (objectFileExists && !metadataSaved) {
                    await unlink(objectPath).catch(() => {})
                }
            }
        }
    )

    fastify.get(
        '/uploads',
        {
            schema: {
                response: {
                    200: {
                        type: 'array',
                        items: uploadSchema
                    }
                }
            }
        },
        async () => {
            return listUploads().map(toUploadApi)
        }
    )

    fastify.get<{ Params: UploadParams }>(
        '/uploads/:id/download',
        {
            schema: {
                params: uploadIdSchema
            }
        },
        async (request, reply) => {
            const record = findUpload(request.params.id)

            if (!record) {
                return reply.code(404).send({
                    error: 'Upload not found.'
                })
            }

            const objectPath = join(OBJECTS_DIR, record.storageKey)

            let handle

            try {
                handle = await open(objectPath, 'r')
            } catch (error) {
                if (
                    error instanceof Error &&
                    'code' in error &&
                    error.code === 'ENOENT'
                ) {
                    return reply.code(404).send({
                        error: 'Stored content not found.'
                    })
                }

                throw error
            }

            return reply
                .header('Content-Type', record.mimeType)
                .header(
                    'Content-Disposition',
                    buildContentDisposition(
                        record.originalName,
                        `${record.storageKey}.${record.extension}`
                    )
                )
                .header('X-Content-Type-Options', 'nosniff')
                .header('Cache-Control', 'private, no-store')
                .header('Content-Length', String(record.size))
                .send(
                    handle.createReadStream({
                        autoClose: true
                    })
                )
        }
    )

    fastify.delete<{ Params: UploadParams }>(
        '/uploads/:id',
        {
            schema: {
                params: uploadIdSchema
            }
        },
        async (request, reply) => {
            const record = findUpload(request.params.id)

            if (!record) {
                return reply.code(404).send({
                    error: 'Upload not found.'
                })
            }

            const objectPath = join(OBJECTS_DIR, record.storageKey)

            try {
                await unlink(objectPath)
            } catch (error) {
                const code =
                    error instanceof Error && 'code' in error
                        ? error.code
                        : undefined

                if (code !== 'ENOENT') {
                    request.log.error(
                        {
                            err: error
                        },
                        'Could not remove stored upload'
                    )

                    return reply.code(500).send({
                        error: 'The stored object could not be removed.'
                    })
                }
            }

            removeUpload(record.id)

            return reply.code(204).send()
        }
    )
}

export default apiRoutes
