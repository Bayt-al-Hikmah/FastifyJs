import type { FastifyPluginAsync } from 'fastify'

import { open } from 'node:fs/promises'

import { ApiError } from '../lib/api-error.js'

import { receiveImage } from '../lib/media-storage.js'

import {
    isValidStorageKey,
    objectPathFor,
    removeStoredObject
} from '../lib/storage-files.js'

import { recipeVisibilityWhere } from '../lib/visibility.js'

import {
    errorResponseSchema,
    recipeIdParamSchema
} from '../schemas/common-schemas.js'

import { photoMetadataSchema } from '../schemas/recipe-schemas.js'


const photoEnvelopeSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: {
            type: 'object',
            properties: {
                photo: photoMetadataSchema
            },
            required: ['photo'],
            additionalProperties: false
        }

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


function serializePhoto(
    recipeId: number,
    photo: {

        id: number

        originalName: string

        mimeType: string

        extension: string

        size: number

        createdAt: Date

    }
) {

    return {

        id: photo.id,

        originalName: photo.originalName,

        mimeType: photo.mimeType,

        extension: photo.extension,

        size: photo.size,

        createdAt: photo.createdAt,

        downloadUrl: `/api/recipes/${recipeId}/photo/download`

    }

}


const photoRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * Upload or replace the photo for a recipe. Ownership is checked before
     * the multipart stream is read, so a member cannot make the server write a
     * file for somebody else's recipe.
     */

    fastify.put<{ Params: { id: number } }>(
        '/recipes/:id/photo',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('CHEF')
            ],

            config: {

                rateLimit: {
                    max: 30,
                    timeWindow: '1 hour'
                }

            },

            schema: {

                params: recipeIdParamSchema,

                response: {

                    200: photoEnvelopeSchema,

                    401: errorResponseSchema,

                    403: errorResponseSchema,

                    404: errorResponseSchema,

                    415: errorResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const recipe = await fastify.prisma.recipe.findFirst({

                where: {

                    id: request.params.id,

                    authorId: user.id

                },

                select: {
                    id: true,
                    photo: {
                        select: {
                            storageKey: true
                        }
                    }
                }

            })


            if (!recipe) {

                return reply.code(404).send({
                    message: 'Recipe not found.'
                })

            }


            const stored = await receiveImage(request)

            const previousStorageKey =
                recipe.photo?.storageKey ?? null


            try {

                const photo = await fastify.prisma.photo.upsert({

                    where: {
                        recipeId: recipe.id
                    },

                    create: {

                        recipeId: recipe.id,

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

                    message: 'Photo uploaded successfully.',

                    data: {
                        photo: serializePhoto(
                            recipe.id,
                            photo
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
        '/recipes/:id/photo',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('CHEF')
            ],

            schema: {

                params: recipeIdParamSchema,

                response: {

                    401: errorResponseSchema,

                    403: errorResponseSchema,

                    404: errorResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const recipe = await fastify.prisma.recipe.findFirst({

                where: {

                    id: request.params.id,

                    authorId: user.id

                },

                select: {
                    id: true,
                    photo: {
                        select: {
                            id: true,
                            storageKey: true
                        }
                    }
                }

            })


            if (!recipe?.photo) {

                return reply.code(404).send({
                    message: 'Photo not found.'
                })

            }


            await fastify.prisma.photo.delete({

                where: {
                    id: recipe.photo.id
                }

            })

            await removeStoredObject(
                recipe.photo.storageKey
            )


            return reply.code(204).send()

        }
    )


    /**
     * Authenticated streaming download. The storage key comes from the
     * database row, never from the URL, and the same visibility rules that
     * protect the recipe detail endpoint apply here.
     */

    fastify.get<{ Params: { id: number } }>(
        '/recipes/:id/photo/download',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                params: recipeIdParamSchema,

                response: {

                    401: errorResponseSchema,

                    404: errorResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const recipe = await fastify.prisma.recipe.findFirst({

                where: {

                    id: request.params.id,

                    ...recipeVisibilityWhere(user)

                },

                select: {
                    id: true,
                    photo: {
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


            const photo = recipe?.photo


            if (!photo) {

                return reply.code(404).send({
                    message: 'Photo not found.'
                })

            }


            if (!isValidStorageKey(photo.storageKey)) {

                throw new ApiError(
                    500,
                    'The stored photo could not be read safely.'
                )

            }


            let handle


            try {

                handle = await open(
                    objectPathFor(photo.storageKey),
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
                        message: 'Photo content not found.'
                    })

                }

                throw error

            }


            return reply
                .header('Content-Type', photo.mimeType)
                .header(
                    'Content-Disposition',
                    `inline; filename="recipe-${recipe!.id}.${photo.extension}"`
                )
                .header('X-Content-Type-Options', 'nosniff')
                .header('Cache-Control', 'private, no-store')
                .header('Content-Length', String(photo.size))
                .send(
                    handle.createReadStream({
                        autoClose: true
                    })
                )

        }
    )

}


export default photoRoutes
