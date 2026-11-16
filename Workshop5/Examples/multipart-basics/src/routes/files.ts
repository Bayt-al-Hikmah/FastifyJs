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
    createFileRecord,
    findFile,
    removeFile
} from '../lib/upload-store.js'

import {
    UploadRejection,
    type UploadErrorCode
} from '../lib/upload-errors.js'

type FileParams = {
    id: string
}

const fileIdSchema = {
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

function redirectWithError(
    reply: FastifyReply,
    code: UploadErrorCode
): FastifyReply {
    return reply.redirect(`/?error=${encodeURIComponent(code)}`, 303)
}

function redirectWithNotice(
    reply: FastifyReply,
    notice: 'uploaded' | 'deleted'
): FastifyReply {
    return reply.redirect(`/?notice=${notice}`, 303)
}

async function drainStream(
    stream: Readable
): Promise<void> {
    await pipeline(
        stream,
        new Writable({
            write(_chunk, _encoding, callback) {
                callback()
            }
        })
    )
}

const filesRoutes: FastifyPluginAsync = async (fastify) => {
    // Private storage is created once and never served as static content.
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

    fastify.post('/upload', async (request, reply) => {
        if (!request.isMultipart()) {
            return redirectWithError(reply, 'not-multipart')
        }

        const part = await request.file({
            throwFileSizeLimit: false
        })

        if (!part) {
            return redirectWithError(reply, 'missing-file')
        }

        if (part.fieldname !== 'file') {
            await drainStream(part.file).catch(() => {})

            return redirectWithError(reply, 'wrong-field')
        }

        const storageKey = randomUUID()
        const stagingPath = join(STAGING_DIR, `${storageKey}.part`)
        const objectPath = join(OBJECTS_DIR, storageKey)

        let stagingFileExists = false
        let objectFileExists = false
        let metadataSaved = false

        try {
            // "wx" refuses to overwrite an existing file, even if a UUID
            // collision were ever produced.
            const handle = await open(stagingPath, 'wx', 0o600)
            stagingFileExists = true

            await pipeline(
                part.file,
                handle.createWriteStream({
                    autoClose: true
                })
            )

            if (part.file.truncated) {
                throw new UploadRejection(
                    'too-large',
                    'The file exceeded the multipart size limit while streaming.',
                    413
                )
            }

            const fileStats = await stat(stagingPath)

            if (fileStats.size === 0) {
                throw new UploadRejection(
                    'empty-file',
                    'The uploaded file is empty.',
                    400
                )
            }

            if (fileStats.size > MAX_UPLOAD_BYTES) {
                throw new UploadRejection(
                    'too-large',
                    'The stored file is too large.',
                    413
                )
            }

            const originalName = sanitizeOriginalName(part.filename)

            const validated = await validateStoredFile(
                stagingPath,
                originalName,
                part.mimetype
            )

            await rename(stagingPath, objectPath)
            stagingFileExists = false
            objectFileExists = true

            createFileRecord({
                originalName,
                storageKey,
                mimeType: validated.mimeType,
                extension: validated.extension,
                size: fileStats.size
            })

            metadataSaved = true

            return redirectWithNotice(reply, 'uploaded')
        } catch (error) {
            if (error instanceof UploadRejection) {
                request.log.info(
                    {
                        code: error.code
                    },
                    'Upload rejected'
                )

                return redirectWithError(reply, error.code)
            }

            request.log.error(
                {
                    err: error
                },
                'Unexpected upload failure'
            )

            return redirectWithError(reply, 'upload-failed')
        } finally {
            // Remove the temporary write if validation failed.
            if (stagingFileExists) {
                await unlink(stagingPath).catch(() => {})
            }

            // Do not leave an object behind without metadata.
            if (objectFileExists && !metadataSaved) {
                await unlink(objectPath).catch(() => {})
            }
        }
    })

    fastify.get<{ Params: FileParams }>(
        '/files/:id/download',
        {
            schema: {
                params: fileIdSchema
            }
        },
        async (request, reply) => {
            const record = findFile(request.params.id)

            if (!record) {
                return reply.code(404).viewAsync('not-found', {
                    title: 'File not found',
                    description: 'The requested file is no longer stored.',
                    message: 'That file has already left the cabinet.',
                    isHome: false
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
                    return reply.code(404).viewAsync('not-found', {
                        title: 'File content missing',
                        description:
                            'The file metadata exists, but the stored object is missing.',
                        message: 'The cabinet record points to an empty shelf.',
                        isHome: false
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

    fastify.post<{ Params: FileParams }>(
        '/files/:id/delete',
        {
            schema: {
                params: fileIdSchema
            }
        },
        async (request, reply) => {
            const record = findFile(request.params.id)

            if (!record) {
                return redirectWithError(reply, 'not-found')
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
                        'Could not remove stored file'
                    )

                    return redirectWithError(reply, 'upload-failed')
                }
            }

            removeFile(record.id)

            return redirectWithNotice(reply, 'deleted')
        }
    )
}

export default filesRoutes
