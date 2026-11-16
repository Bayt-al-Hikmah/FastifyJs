import type { FastifyPluginAsync } from 'fastify'

import { randomUUID } from 'node:crypto'

import { createReadStream } from 'node:fs'

import {
    open,
    rename,
    stat
} from 'node:fs/promises'

import {
    extname,
    join
} from 'node:path'

import { Writable } from 'node:stream'

import { pipeline } from 'node:stream/promises'

import { fileTypeFromFile } from 'file-type'

import {
    ALLOWED_IMAGE_TYPES,
    MAX_ATTACHMENT_SIZE,
    ORIGINALS_DIR,
    STAGING_DIR,
    THUMBNAILS_DIR,
    expectedMimeTypeForExtension
} from '../config/uploads.js'

import {
    ImageProcessingError,
    contentDisposition,
    createThumbnail,
    ensureStorageDirectories,
    removeFileQuietly,
    sanitizeOriginalName
} from '../lib/image-processing.js'


type TaskParams = {
    taskId: number
}

type AttachmentParams = {
    attachmentId: number
}


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


const attachmentResponseSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        taskId: { type: 'integer' },

        originalName: { type: 'string' },

        mimeType: { type: 'string' },

        extension: { type: 'string' },

        size: { type: 'integer' },

        thumbnailMimeType: { type: 'string' },

        thumbnailSize: { type: 'integer' },

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
        'thumbnailMimeType',
        'thumbnailSize',
        'createdAt'
    ],

    additionalProperties: false

} as const


const attachmentSelect = {

    id: true,

    taskId: true,

    originalName: true,

    mimeType: true,

    extension: true,

    size: true,

    thumbnailMimeType: true,

    thumbnailSize: true,

    createdAt: true

} as const


async function drainFile(
    stream: NodeJS.ReadableStream
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


const attachmentRoutes: FastifyPluginAsync = async (fastify) => {

    await ensureStorageDirectories()

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

            if (!request.isMultipart()) {

                return reply.code(415).send({
                    error: 'Expected multipart/form-data'
                })

            }

            const part = await request.file({

                throwFileSizeLimit: false

            })

            if (!part) {

                return reply.code(400).send({
                    error: 'No file was provided'
                })

            }

            if (part.fieldname !== 'file') {

                await drainFile(part.file)

                return reply.code(400).send({
                    error: 'The file field must be named "file"'
                })

            }

            const storageKey = randomUUID()
            const thumbnailKey = randomUUID()

            const stagingPath = join(
                STAGING_DIR,
                `${storageKey}.part`
            )

            const originalPath = join(
                ORIGINALS_DIR,
                storageKey
            )

            const thumbnailPath = join(
                THUMBNAILS_DIR,
                thumbnailKey
            )

            let metadataCreated = false

            try {

                const handle = await open(
                    stagingPath,
                    'wx',
                    0o600
                )

                await pipeline(
                    part.file,
                    handle.createWriteStream({
                        autoClose: true
                    })
                )

                if (part.file.truncated) {

                    return reply.code(413).send({
                        error: 'File exceeds the maximum allowed size'
                    })

                }

                const stagedStats = await stat(stagingPath)

                if (stagedStats.size === 0) {

                    return reply.code(400).send({
                        error: 'Empty files are not allowed'
                    })

                }

                if (stagedStats.size > MAX_ATTACHMENT_SIZE) {

                    return reply.code(413).send({
                        error: 'File exceeds the maximum allowed size'
                    })

                }

                const originalName = sanitizeOriginalName(
                    part.filename
                )

                const extension = extname(
                    originalName
                ).toLowerCase()

                const expectedMime =
                    expectedMimeTypeForExtension(extension)

                if (!expectedMime) {

                    return reply.code(415).send({
                        error: 'Only JPEG and PNG images can be uploaded'
                    })

                }

                const detected = await fileTypeFromFile(
                    stagingPath,
                    {
                        maxBufferSize: 64 * 1024
                    }
                )

                if (
                    !detected ||
                    !ALLOWED_IMAGE_TYPES[detected.mime]
                ) {

                    return reply.code(415).send({
                        error: 'File content is not a supported image'
                    })

                }

                if (detected.mime !== expectedMime) {

                    return reply.code(415).send({
                        error: 'File content does not match the file extension'
                    })

                }

                if (
                    part.mimetype !== 'application/octet-stream' &&
                    part.mimetype !== detected.mime
                ) {

                    return reply.code(415).send({
                        error: 'Declared MIME type does not match the file content'
                    })

                }

                await rename(
                    stagingPath,
                    originalPath
                )

                await createThumbnail(
                    originalPath,
                    thumbnailPath,
                    detected.mime
                )

                const thumbnailStats = await stat(thumbnailPath)

                if (thumbnailStats.size === 0) {
                    throw new ImageProcessingError(
                        'Thumbnail generation produced an empty file'
                    )
                }

                const attachment = await fastify.prisma.attachment.create({

                    data: {

                        taskId: task.id,

                        uploadedById: user.id,

                        originalName,

                        storageKey,

                        mimeType: detected.mime,

                        extension,

                        size: Number(stagedStats.size),

                        thumbnailKey,

                        thumbnailMimeType: detected.mime,

                        thumbnailSize: Number(thumbnailStats.size)

                    },

                    select: attachmentSelect

                })

                metadataCreated = true

                return reply.code(201).send(attachment)

            } catch (error) {

                if (error instanceof ImageProcessingError) {

                    request.log.warn(
                        { err: error },
                        'Thumbnail generation rejected an upload'
                    )

                    return reply.code(422).send({
                        error: 'The image could not be processed safely'
                    })

                }

                throw error

            } finally {

                await removeFileQuietly(stagingPath)

                if (!metadataCreated) {

                    await removeFileQuietly(originalPath)

                    await removeFileQuietly(thumbnailPath)

                }

            }

        }
    )

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

                select: attachmentSelect,

                orderBy: {
                    createdAt: 'desc'
                }

            })

        }
    )

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

            const attachment = await fastify.prisma.attachment.findFirst({

                where: {

                    id: request.params.attachmentId,

                    task: user.role === 'ADMIN'
                        ? undefined
                        : { createdById: user.id }

                },

                select: {
                    originalName: true,
                    storageKey: true,
                    mimeType: true,
                    size: true
                }

            })

            if (!attachment) {

                return reply.code(404).send({
                    error: 'Attachment not found'
                })

            }

            const filePath = join(
                ORIGINALS_DIR,
                attachment.storageKey
            )

            let fileStats

            try {

                fileStats = await stat(filePath)

            } catch {

                return reply.code(404).send({
                    error: 'Stored file not found'
                })

            }

            reply
                .header('Content-Type', attachment.mimeType)
                .header('Content-Length', String(fileStats.size))
                .header(
                    'Content-Disposition',
                    contentDisposition(
                        'attachment',
                        attachment.originalName
                    )
                )
                .header('Cache-Control', 'private, no-store')

            return reply.send(createReadStream(filePath))

        }
    )

    fastify.get<{ Params: AttachmentParams }>(
        '/attachments/:attachmentId/thumbnail',

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

                    task: user.role === 'ADMIN'
                        ? undefined
                        : { createdById: user.id }

                },

                select: {
                    originalName: true,
                    thumbnailKey: true,
                    thumbnailMimeType: true
                }

            })

            if (!attachment) {

                return reply.code(404).send({
                    error: 'Attachment not found'
                })

            }

            const thumbnailPath = join(
                THUMBNAILS_DIR,
                attachment.thumbnailKey
            )

            let thumbnailStats

            try {

                thumbnailStats = await stat(thumbnailPath)

            } catch {

                return reply.code(404).send({
                    error: 'Thumbnail not found'
                })

            }

            reply
                .header('Content-Type', attachment.thumbnailMimeType)
                .header('Content-Length', String(thumbnailStats.size))
                .header(
                    'Content-Disposition',
                    contentDisposition(
                        'inline',
                        `thumbnail-${attachment.originalName}`
                    )
                )
                .header('Cache-Control', 'private, max-age=3600')

            return reply.send(createReadStream(thumbnailPath))

        }
    )

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

                    task: user.role === 'ADMIN'
                        ? undefined
                        : { createdById: user.id }

                },

                select: {
                    id: true,
                    storageKey: true,
                    thumbnailKey: true
                }

            })

            if (!attachment) {

                return reply.code(404).send({
                    error: 'Attachment not found'
                })

            }

            await fastify.prisma.attachment.delete({

                where: {
                    id: attachment.id
                }

            })

            // Filesystem cleanup is best effort. A failure here leaves an
            // orphaned object, but it cannot break the database state.

            await removeFileQuietly(
                join(ORIGINALS_DIR, attachment.storageKey)
            )

            await removeFileQuietly(
                join(THUMBNAILS_DIR, attachment.thumbnailKey)
            )

            return reply.code(204).send()

        }
    )

}


export default attachmentRoutes
