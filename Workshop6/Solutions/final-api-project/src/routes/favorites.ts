import type { FastifyPluginAsync } from 'fastify'

import {
    errorResponseSchema,
    listResponseSchema,
    recipeIdParamSchema
} from '../schemas/common-schemas.js'

import {
    favoriteActionResponseSchema,
    recipeResponseSchema
} from '../schemas/recipe-schemas.js'

import {
    buildPagination,
    resolvePagination,
    type PaginationQuery
} from '../lib/pagination.js'

import {
    recipeSelect,
    serializeRecipe
} from '../lib/serializers.js'

import { recipeVisibilityWhere } from '../lib/visibility.js'


type FavoriteListQuery = PaginationQuery


const favoriteRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * Toggle the signed-in user's favorite. The recipe lookup reuses the same
     * visibility rule as the detail endpoint, so a draft cannot be favorited
     * by guessing its ID. Roles are deliberately not restricted here: members
     * are the main audience, but chefs may bookmark recipes too.
     */

    fastify.post<{ Params: { id: number } }>(
        '/recipes/:id/favorite',

        {

            preHandler: [
                fastify.authenticate
            ],

            config: {

                rateLimit: {
                    max: 60,
                    timeWindow: '15 minutes'
                }

            },

            schema: {

                params: recipeIdParamSchema,

                response: {

                    200: favoriteActionResponseSchema,

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
                    id: true
                }

            })


            if (!recipe) {

                return reply.code(404).send({
                    message: 'Recipe not found.'
                })

            }


            const existing = await fastify.prisma.favorite.findFirst({

                where: {

                    userId: user.id,

                    recipeId: recipe.id

                },

                select: {
                    recipeId: true
                }

            })


            if (existing) {

                await fastify.prisma.favorite.deleteMany({
                    where: {
                        userId: user.id,
                        recipeId: recipe.id
                    }
                })

            } else {

                await fastify.prisma.favorite.create({

                    data: {
                        userId: user.id,
                        recipeId: recipe.id
                    }

                })

            }


            const favoriteCount = await fastify.prisma.favorite.count({

                where: {
                    recipeId: recipe.id
                }

            })


            return {

                message: existing
                    ? 'Removed from your favorites.'
                    : 'Added to your favorites.',

                data: {

                    recipeId: recipe.id,

                    isFavorite: !existing,

                    favoriteCount

                }

            }

        }
    )


    /**
     * The current user's bookmarked recipes. Only published rows are listed,
     * and pagination metadata makes the collection safe for large accounts.
     */

    fastify.get<{ Querystring: FavoriteListQuery }>(
        '/me/favorites',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                querystring: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 1_000_000,
                            default: 1
                        },
                        limit: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 20
                        }
                    },
                    additionalProperties: false
                } as const,

                response: {

                    200: listResponseSchema(recipeResponseSchema),

                    401: errorResponseSchema

                }

            }

        },

        async (request) => {

            const user = request.currentUser!

            const { page, limit, skip } = resolvePagination(request.query)

            const where = {

                status: 'PUBLISHED' as const,

                favorites: {
                    some: {
                        userId: user.id
                    }
                }

            }


            const [rows, total] = await Promise.all([

                fastify.prisma.recipe.findMany({

                    where,

                    select: recipeSelect,

                    orderBy: [
                        { createdAt: 'desc' },
                        { id: 'desc' }
                    ],

                    skip,

                    take: limit

                }),

                fastify.prisma.recipe.count({ where })

            ])


            return {

                message: 'Favorites retrieved.',

                data: rows.map((row) =>
                    serializeRecipe(
                        row,
                        true
                    )
                ),

                pagination: buildPagination(page, limit, total)

            }

        }
    )

}


export default favoriteRoutes
