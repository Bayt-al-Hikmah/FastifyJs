import type { FastifyPluginAsync } from 'fastify'

import { open } from 'node:fs/promises'

import { ApiError } from '../lib/api-error.js'

import { receiveImage } from '../lib/media-storage.js'

import {
    isValidStorageKey,
    objectPathFor,
    removeStoredObject
} from '../lib/storage-files.js'

import { resourceVisibilityWhere } from '../lib/visibility.js'

import {
    errorResponseSchema,
    resourceIdParamSchema
} from '../schemas/common-schemas.js'

import { attachmentMetadataSchema } from '../schemas/resource-schemas.js'


const attachmentEnvelopeSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {
            type: 'object',
            properties: {
                attachment: attachmentMetadataSchema
            },
            required: ['attachment'],
            additionalProperties: false
        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


function serializeAttachment(
    resourceId: number,
    attachment: {

        id: number

        originalName: string

        mimeType: string

        extension: string

        size: number

        createdAt: Date

    }
) {

    return {

        id: attachment.id,

        originalName: attachment.originalName,

        mimeType: attachment.mimeType,

        extension: attachment.extension,

        size: attachment.size,

        createdAt: attachment.createdAt,

        downloadUrl: `/api/resources/${resourceId}/attachment/download`

    }

}


const attachmentRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * Upload or replace the image attached to a resource. Ownership is checked
     * before the multipart stream is read, so a student cannot make the server
     * write a file for somebody else's resource.
     */

    fastify.put<{ Params: { id: number } }>(
        '/resources/:id/attachment',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('INSTRUCTOR')
            ],

            config: {

                rateLimit: {
                    max: 30,
                    timeWindow: '1 hour'
                }

            },

            schema: {

                params: resourceIdParamSchema,

                response: {

                    200: attachmentEnvelopeSchema,

                    401: errorResponseSchema,

                    403: errorResponseSchema,

                    404: errorResponseSchema,

                    415: errorResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const resource = await fastify.prisma.resource.findFirst({

                where: {

                    id: request.params.id,

                    instructorId: user.id

                },

                select: {
                    id: true,
                    attachment: {
                        select: {
                            storageKey: true
                        }
                    }
                }

            })


            if (!resource) {

                return reply.code(404).send({
                    message: 'Resource not found.'
                })

            }


            const stored = await receiveImage(request)

            const previousStorageKey =
                resource.attachment?.storageKey ?? null


            try {

                const attachment =
                    await fastify.prisma.attachment.upsert({

                        where: {
                            resourceId: resource.id
                        },

                        create: {

                            resourceId: resource.id,

                            originalName: stored.originalName,

                            storageKey: stored.storageKey,

                            mimeType: stored.mimeType,

                            extension: stored.extension,

                            size: stored.size

                        },

                        update: {

                            originalName: stored.originalName,

                            storageKey: stored.storageKey,

                            mimeType: stored.mimeType,

                            extension: stored.extension,

                            size: stored.size

                        },

                        select: {
                            id: true,
                            originalName: true,
                            mimeType: true,
                            extension: true,
                            size: true,
                            createdAt: true
                        }

                    })


                // The database now points at the new object. Only then is it
                // safe to remove the previous one.
                if (
                    previousStorageKey &&
                    previousStorageKey !== stored.storageKey
                ) {

                    await removeStoredObject(previousStorageKey)

                }


                return reply.code(200).send({

                    message: 'Attachment uploaded successfully.',

                    data: {
                        attachment: serializeAttachment(
                            resource.id,
                            attachment
                        )
                    }

                })

            } catch (error) {

                // Compensating cleanup: never leave an orphaned object when
                // the metadata write fails.
                await removeStoredObject(stored.storageKey)

                throw error

            }

        }
    )


    fastify.delete<{ Params: { id: number } }>(
        '/resources/:id/attachment',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('INSTRUCTOR')
            ],

            schema: {

                params: resourceIdParamSchema,

                response: {

                    401: errorResponseSchema,

                    403: errorResponseSchema,

                    404: errorResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const resource = await fastify.prisma.resource.findFirst({

                where: {

                    id: request.params.id,

                    instructorId: user.id

                },

                select: {
                    id: true,
                    attachment: {
                        select: {
                            id: true,
                            storageKey: true
                        }
                    }
                }

            })


            if (!resource?.attachment) {

                return reply.code(404).send({
                    message: 'Attachment not found.'
                })

            }


            await fastify.prisma.attachment.delete({

                where: {
                    id: resource.attachment.id
                }

            })

            await removeStoredObject(
                resource.attachment.storageKey
            )


            return reply.code(204).send()

        }
    )


    /**
     * Authenticated streaming download. The storage key comes from the
     * database row, never from the URL, and the same visibility rules that
     * protect the resource detail endpoint apply here.
     */

    fastify.get<{ Params: { id: number } }>(
        '/resources/:id/attachment/download',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: resourceIdParamSchema,

                response: {

                    401: errorResponseSchema,

                    404: errorResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const resource = await fastify.prisma.resource.findFirst({

                where: {

                    id: request.params.id,

                    ...resourceVisibilityWhere(user)

                },

                select: {
                    id: true,
                    attachment: {
                        select: {
                            originalName: true,
                            storageKey: true,
                            mimeType: true,
                            extension: true,
                            size: true
                        }
                    }
                }

            })


            const attachment = resource?.attachment


            if (!attachment) {

                return reply.code(404).send({
                    message: 'Attachment not found.'
                })

            }


            if (!isValidStorageKey(attachment.storageKey)) {

                throw new ApiError(
                    500,
                    'The stored attachment could not be read safely.'
                )

            }


            let handle


            try {

                handle = await open(
                    objectPathFor(attachment.storageKey),
                    'r'
                )

            } catch (error) {

                const isMissing =
                    typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    error.code === 'ENOENT'


                if (isMissing) {

                    return reply.code(404).send({
                        message: 'Attachment content not found.'
                    })

                }

                throw error

            }


            return reply
                .header('Content-Type', attachment.mimeType)
                .header(
                    'Content-Disposition',
                    `inline; filename="resource-${resource!.id}.${attachment.extension}"`
                )
                .header('X-Content-Type-Options', 'nosniff')
                .header('Cache-Control', 'private, no-store')
                .header('Content-Length', String(attachment.size))
                .send(
                    handle.createReadStream({
                        autoClose: true
                    })
                )

        }
    )

}


export default attachmentRoutes
