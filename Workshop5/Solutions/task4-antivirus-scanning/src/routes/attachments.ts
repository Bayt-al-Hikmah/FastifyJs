import type {
    FastifyInstance,
    FastifyPluginAsync
} from 'fastify'

import { randomUUID } from 'node:crypto'

import { createReadStream } from 'node:fs'

import {
    open,
    readFile,
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
    ALLOWED_MIME_TYPES,
    MAX_ATTACHMENT_SIZE,
    STAGING_DIR,
    expectedMimeTypeForExtension
} from '../config/scans.js'

import {
    contentDisposition,
    ensureScanStorageDirectories,
    objectPathFor,
    quarantinePathFor,
    removeFileQuietly,
    sanitizeOriginalName
} from '../lib/file-storage.js'

import type { Prisma } from '../generated/prisma/client.js'


type TaskParams = {
    taskId: number
}

type AttachmentParams = {
    attachmentId: number
}

type ScanState =
    | 'PENDING_SCAN'
    | 'SCANNING'
    | 'AVAILABLE'
    | 'REJECTED'

type ScanLocation = 'quarantine' | 'objects'


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

        scanStatus: {
            type: 'string',
            enum: [
                'PENDING_SCAN',
                'SCANNING',
                'AVAILABLE',
                'REJECTED'
            ]
        },

        scanMessage: { type: ['string', 'null'] },

        scanner: { type: ['string', 'null'] },

        scannedAt: {
            type: ['string', 'null'],
            format: 'date-time'
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
        'scanStatus',
        'scanMessage',
        'scanner',
        'scannedAt',
        'createdAt'
    ],

    additionalProperties: false

} as const


const scannerInfoSchema = {

    type: 'object',

    properties: {

        name: { type: 'string' },

        mode: {
            type: 'string',
            enum: ['mock', 'clamav']
        }

    },

    required: ['name', 'mode'],

    additionalProperties: false

} as const


const attachmentSelect = {

    id: true,

    taskId: true,

    originalName: true,

    mimeType: true,

    extension: true,

    size: true,

    scanStatus: true,

    scanMessage: true,

    scanner: true,

    scannedAt: true,

    createdAt: true

} as const


type AttachmentRecord = Prisma.AttachmentGetPayload<{
    select: typeof attachmentSelect
}>


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


async function isValidTextFile(filePath: string): Promise<boolean> {

    const content = await readFile(filePath)

    if (content.length === 0 || content.includes(0)) {
        return false
    }

    try {

        new TextDecoder('utf-8', {
            fatal: true
        }).decode(content)

        return true

    } catch {

        return false

    }

}


function truncateMessage(message: string): string {

    return message.slice(0, 255)

}


async function scanAttachment(
    fastify: FastifyInstance,
    attachment: {
        id: number
        storageKey: string
        scanStatus: ScanState
    },
    location: ScanLocation
): Promise<{
    attachment: AttachmentRecord
    scannerFailed: boolean
}> {

    const sourcePath = location === 'quarantine'
        ? quarantinePathFor(attachment.storageKey)
        : objectPathFor(attachment.storageKey)

    await fastify.prisma.attachment.update({

        where: {
            id: attachment.id
        },

        data: {
            scanStatus: 'SCANNING',
            scanMessage: 'Scanning in progress'
        }

    })

    let result

    try {

        result = await fastify.scanner.scanFile(sourcePath)

    } catch (error) {

        fastify.log.warn({
            err: error,
            attachmentId: attachment.id
        }, 'Malware scanner failed')

        const fallbackStatus: ScanState =
            location === 'objects'
                ? 'AVAILABLE'
                : 'PENDING_SCAN'

        const fallbackMessage =
            location === 'objects'
                ? 'Rescan failed; the previous clean result remains in effect'
                : 'Scanner unavailable; the file remains quarantined'

        const reverted = await fastify.prisma.attachment.update({

            where: {
                id: attachment.id
            },

            data: {
                scanStatus: fallbackStatus,
                scanMessage: truncateMessage(fallbackMessage)
            },

            select: attachmentSelect

        })

        return {
            attachment: reverted,
            scannerFailed: true
        }

    }

    if (result.verdict === 'INFECTED') {

        // Rejected content is removed immediately. The database keeps a
        // REJECTED row so owners and administrators can still see the event.

        await removeFileQuietly(sourcePath)

        const rejected = await fastify.prisma.attachment.update({

            where: {
                id: attachment.id
            },

            data: {
                scanStatus: 'REJECTED',
                scanMessage: truncateMessage(result.message),
                scanner: result.scanner,
                scannedAt: new Date()
            },

            select: attachmentSelect

        })

        return {
            attachment: rejected,
            scannerFailed: false
        }

    }

    if (location === 'quarantine') {

        try {

            await rename(
                sourcePath,
                objectPathFor(attachment.storageKey)
            )

        } catch (error) {

            fastify.log.error({
                err: error,
                attachmentId: attachment.id
            }, 'Clean file could not be moved out of quarantine')

            const pending = await fastify.prisma.attachment.update({

                where: {
                    id: attachment.id
                },

                data: {
                    scanStatus: 'PENDING_SCAN',
                    scanMessage: truncateMessage(
                        'Clean scan completed but the file could not be released'
                    )
                },

                select: attachmentSelect

            })

            return {
                attachment: pending,
                scannerFailed: true
            }

        }

    }

    const available = await fastify.prisma.attachment.update({

        where: {
            id: attachment.id
        },

        data: {
            scanStatus: 'AVAILABLE',
            scanMessage: truncateMessage(result.message),
            scanner: result.scanner,
            scannedAt: new Date()
        },

        select: attachmentSelect

    })

    return {
        attachment: available,
        scannerFailed: false
    }

}


const attachmentRoutes: FastifyPluginAsync = async (fastify) => {

    await ensureScanStorageDirectories()

    fastify.get(
        '/scanner',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                response: {
                    200: scannerInfoSchema
                }

            }

        },

        async () => {

            return {
                name: fastify.scanner.name,
                mode: fastify.scanner.mode
            }

        }
    )

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

            const stagingPath = join(
                STAGING_DIR,
                `${storageKey}.part`
            )

            const quarantinePath = quarantinePathFor(storageKey)

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
                        error: 'Unsupported file extension'
                    })

                }

                const detected = await fileTypeFromFile(
                    stagingPath,
                    {
                        maxBufferSize: 64 * 1024
                    }
                )

                let actualMime: string

                if (detected) {

                    if (!ALLOWED_MIME_TYPES[detected.mime]) {

                        return reply.code(415).send({
                            error: 'Unsupported file format'
                        })

                    }

                    actualMime = detected.mime

                } else if (
                    expectedMime === 'text/plain' &&
                    await isValidTextFile(stagingPath)
                ) {

                    // file-type intentionally does not identify plain text.
                    // Accept it only when the extension declares text/plain and
                    // the bytes are valid UTF-8 without NUL characters.

                    actualMime = 'text/plain'

                } else {

                    return reply.code(415).send({
                        error: 'File content could not be verified'
                    })

                }

                if (actualMime !== expectedMime) {

                    return reply.code(415).send({
                        error: 'File content does not match the file extension'
                    })

                }

                if (
                    part.mimetype !== 'application/octet-stream' &&
                    part.mimetype !== actualMime
                ) {

                    return reply.code(415).send({
                        error: 'Declared MIME type does not match the file content'
                    })

                }

                await rename(
                    stagingPath,
                    quarantinePath
                )

                const created = await fastify.prisma.attachment.create({

                    data: {

                        taskId: task.id,

                        uploadedById: user.id,

                        originalName,

                        storageKey,

                        mimeType: actualMime,

                        extension,

                        size: Number(stagedStats.size),

                        scanStatus: 'PENDING_SCAN',

                        scanMessage: 'Waiting in quarantine'

                    },

                    select: attachmentSelect

                })

                metadataCreated = true

                const scan = await scanAttachment(
                    fastify,
                    created,
                    'quarantine'
                )

                return reply.code(201).send(scan.attachment)

            } finally {

                await removeFileQuietly(stagingPath)

                if (!metadataCreated) {

                    await removeFileQuietly(quarantinePath)

                    await removeFileQuietly(
                        objectPathFor(storageKey)
                    )

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
                    scanStatus: true
                }

            })

            if (!attachment) {

                return reply.code(404).send({
                    error: 'Attachment not found'
                })

            }

            if (attachment.scanStatus !== 'AVAILABLE') {

                return reply.code(409).send({
                    error:
                        'Attachment is not available for download ' +
                        `(status: ${attachment.scanStatus})`
                })

            }

            const filePath = objectPathFor(attachment.storageKey)

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

    fastify.post<{ Params: AttachmentParams }>(
        '/attachments/:attachmentId/rescan',

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

                params: attachmentIdSchema,

                response: {
                    200: attachmentResponseSchema
                }

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
                    scanStatus: true
                }

            })

            if (!attachment) {

                return reply.code(404).send({
                    error: 'Attachment not found'
                })

            }

            if (attachment.scanStatus === 'REJECTED') {

                return reply.code(409).send({
                    error: 'Rejected files are removed from storage and cannot be rescanned'
                })

            }

            if (attachment.scanStatus === 'SCANNING') {

                return reply.code(409).send({
                    error: 'A scan is already in progress'
                })

            }

            const location: ScanLocation =
                attachment.scanStatus === 'AVAILABLE'
                    ? 'objects'
                    : 'quarantine'

            const filePath = location === 'quarantine'
                ? quarantinePathFor(attachment.storageKey)
                : objectPathFor(attachment.storageKey)

            try {

                await stat(filePath)

            } catch {

                return reply.code(404).send({
                    error: 'Stored file not found'
                })

            }

            const scan = await scanAttachment(
                fastify,
                {
                    id: attachment.id,
                    storageKey: attachment.storageKey,
                    scanStatus: attachment.scanStatus
                },
                location
            )

            if (scan.scannerFailed) {

                return reply.code(503).send({
                    error: 'The malware scanner is unavailable; no unscanned file was released'
                })

            }

            return reply.code(200).send(scan.attachment)

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
                    storageKey: true
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

            await removeFileQuietly(
                quarantinePathFor(attachment.storageKey)
            )

            await removeFileQuietly(
                objectPathFor(attachment.storageKey)
            )

            return reply.code(204).send()

        }
    )

}


export default attachmentRoutes
