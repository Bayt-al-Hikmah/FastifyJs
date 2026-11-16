import type { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'node:crypto'
import { basename, extname } from 'node:path'
import {
    createPresignedDownloadUrl,
    createPresignedUploadUrl,
    deleteS3Object,
    getS3ObjectStream,
    verifyS3Object
} from '../lib/s3-storage.js'
import { S3_BUCKET } from '../config/s3.js'
import type { AuthenticatedUser } from '../types/auth.js'

type TaskParams = {
    taskId: number
}

type AttachmentParams = {
    attachmentId: number
}

type PresignUploadBody = {
    originalName: string
    mimeType: string
}

type ConfirmUploadBody = {
    storageKey: string
    originalName: string
    mimeType: string
}

function sanitizeName(filename: string): string {
    const name = basename(filename.replaceAll('\\', '/')).replace(/[\u0000-\u001F\u007F]/g, '').trim()
    return (name || 'attachment').slice(0, 255)
}

const attachmentsRoutes: FastifyPluginAsync = async (fastify) => {
    // 1. Generate Presigned Upload URL
    fastify.post<{ Params: TaskParams; Body: PresignUploadBody }>(
        '/tasks/:taskId/attachments/presign-upload',
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: {
                    type: 'object',
                    required: ['taskId'],
                    properties: { taskId: { type: 'integer' } }
                },
                body: {
                    type: 'object',
                    required: ['originalName', 'mimeType'],
                    properties: {
                        originalName: { type: 'string', minLength: 1, maxLength: 255 },
                        mimeType: { type: 'string', minLength: 3, maxLength: 100 }
                    }
                }
            }
        },
        async (request, reply) => {
            const user = request.currentUser!
            const task = await findAccessibleTask(fastify, request.params.taskId, user)

            if (!task) {
                return reply.code(404).send({ error: 'Task not found' })
            }

            const cleanName = sanitizeName(request.body.originalName)
            const ext = extname(cleanName).toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
            const storageKey = `tasks/${task.id}/${randomUUID()}.${ext}`

            const uploadUrl = await createPresignedUploadUrl(storageKey, request.body.mimeType)

            return reply.code(200).send({
                uploadUrl,
                storageKey,
                bucket: S3_BUCKET,
                expiresInSeconds: 300
            })
        }
    )

    // 2. Confirm Upload after direct client PUT to S3
    fastify.post<{ Params: TaskParams; Body: ConfirmUploadBody }>(
        '/tasks/:taskId/attachments/confirm-upload',
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: {
                    type: 'object',
                    required: ['taskId'],
                    properties: { taskId: { type: 'integer' } }
                },
                body: {
                    type: 'object',
                    required: ['storageKey', 'originalName'],
                    properties: {
                        storageKey: { type: 'string', minLength: 5, maxLength: 255 },
                        originalName: { type: 'string', minLength: 1, maxLength: 255 },
                        mimeType: { type: 'string', maxLength: 100 }
                    }
                }
            }
        },
        async (request, reply) => {
            const user = request.currentUser!
            const task = await findAccessibleTask(fastify, request.params.taskId, user)

            if (!task) {
                return reply.code(404).send({ error: 'Task not found' })
            }

            const { storageKey, originalName } = request.body

            // Expected key prefix prevents linking arbitrary keys
            if (!storageKey.startsWith(`tasks/${task.id}/`)) {
                return reply.code(400).send({ error: 'Invalid storage key for this task' })
            }

            // Verify the object really exists in S3 and check size
            const s3Meta = await verifyS3Object(storageKey)
            if (!s3Meta) {
                return reply.code(400).send({
                    error: 'Object verification failed. Ensure file was uploaded to the presigned URL and is under 10 MB.'
                })
            }

            const cleanName = sanitizeName(originalName)
            const ext = extname(cleanName).toLowerCase().replace('.', '') || 'bin'

            const attachment = await fastify.prisma.attachment.create({
                data: {
                    taskId: task.id,
                    uploadedById: user.id,
                    originalName: cleanName,
                    storageKey,
                    bucket: S3_BUCKET,
                    mimeType: s3Meta.mimeType,
                    extension: ext,
                    size: s3Meta.size
                }
            })

            return reply.code(201).send({
                message: 'Attachment confirmed and saved',
                attachment
            })
        }
    )

    // 3. List Attachments for Task
    fastify.get<{ Params: TaskParams }>(
        '/tasks/:taskId/attachments',
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: {
                    type: 'object',
                    required: ['taskId'],
                    properties: { taskId: { type: 'integer' } }
                }
            }
        },
        async (request, reply) => {
            const user = request.currentUser!
            const task = await findAccessibleTask(fastify, request.params.taskId, user)

            if (!task) {
                return reply.code(404).send({ error: 'Task not found' })
            }

            return fastify.prisma.attachment.findMany({
                where: { taskId: task.id },
                orderBy: { createdAt: 'desc' }
            })
        }
    )

    // 4. Generate Presigned Download URL
    fastify.get<{ Params: AttachmentParams }>(
        '/attachments/:attachmentId/presign-download',
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: {
                    type: 'object',
                    required: ['attachmentId'],
                    properties: { attachmentId: { type: 'integer' } }
                }
            }
        },
        async (request, reply) => {
            const user = request.currentUser!
            const attachment = await findAccessibleAttachment(fastify, request.params.attachmentId, user)

            if (!attachment) {
                return reply.code(404).send({ error: 'Attachment not found' })
            }

            const downloadUrl = await createPresignedDownloadUrl(attachment.storageKey, attachment.originalName)

            return reply.code(200).send({
                downloadUrl,
                originalName: attachment.originalName,
                expiresInSeconds: 60
            })
        }
    )

    // 5. Stream Download Directly from S3 through Fastify
    fastify.get<{ Params: AttachmentParams }>(
        '/attachments/:attachmentId',
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: {
                    type: 'object',
                    required: ['attachmentId'],
                    properties: { attachmentId: { type: 'integer' } }
                }
            }
        },
        async (request, reply) => {
            const user = request.currentUser!
            const attachment = await findAccessibleAttachment(fastify, request.params.attachmentId, user)

            if (!attachment) {
                return reply.code(404).send({ error: 'Attachment not found' })
            }

            const s3Data = await getS3ObjectStream(attachment.storageKey)
            if (!s3Data) {
                return reply.code(404).send({ error: 'Object content not found in storage' })
            }

            reply.header('Content-Type', s3Data.contentType)
            reply.header('Content-Length', s3Data.contentLength)
            reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`)
            reply.header('X-Content-Type-Options', 'nosniff')
            reply.header('Cache-Control', 'private, no-store')

            return reply.send(s3Data.stream)
        }
    )

    // 6. Delete Attachment from S3 and Database
    fastify.delete<{ Params: AttachmentParams }>(
        '/attachments/:attachmentId',
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: {
                    type: 'object',
                    required: ['attachmentId'],
                    properties: { attachmentId: { type: 'integer' } }
                }
            }
        },
        async (request, reply) => {
            const user = request.currentUser!
            const attachment = await findAccessibleAttachment(fastify, request.params.attachmentId, user)

            if (!attachment) {
                return reply.code(404).send({ error: 'Attachment not found' })
            }

            await deleteS3Object(attachment.storageKey)

            await fastify.prisma.attachment.delete({
                where: { id: attachment.id }
            })

            return reply.code(204).send()
        }
    )
}

async function findAccessibleTask(
    fastify: any,
    taskId: number,
    user: AuthenticatedUser
) {
    return fastify.prisma.task.findFirst({
        where: {
            id: taskId,
            ...(user.role === 'ADMIN'
                ? {}
                : {
                      OR: [{ createdById: user.id }, { assigneeId: user.id }]
                  })
        }
    })
}

async function findAccessibleAttachment(
    fastify: any,
    attachmentId: number,
    user: AuthenticatedUser
) {
    return fastify.prisma.attachment.findFirst({
        where: {
            id: attachmentId,
            ...(user.role === 'ADMIN'
                ? {}
                : {
                      task: {
                          OR: [{ createdById: user.id }, { assigneeId: user.id }]
                      }
                  })
        }
    })
}

export default attachmentsRoutes
