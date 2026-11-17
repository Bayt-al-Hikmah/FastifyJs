import type { FastifyPluginAsync } from 'fastify'

import {
    errorResponseSchema,
    listResponseSchema,
    recipeIdParamSchema
} from '../schemas/common-schemas.js'

import {
    createRecipeSchema,
    myRecipesQuerySchema,
    recipeListQuerySchema,
    recipeResponseSchema,
    updateRecipeSchema
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

import { removeStoredObject } from '../lib/storage-files.js'

import { recipeVisibilityWhere } from '../lib/visibility.js'


type RecipeCategory =
    | 'BREAKFAST'
    | 'LUNCH'
    | 'DINNER'
    | 'DESSERT'
    | 'SNACK'
    | 'BEVERAGE'

type PublicationStatus = 'DRAFT' | 'PUBLISHED'


type RecipeListQuery = PaginationQuery & {

    search?: string

    category?: RecipeCategory

    maxPrep?: number

}


type MyRecipesQuery = PaginationQuery & {

    search?: string

    status?: PublicationStatus

    category?: RecipeCategory

}


type CreateRecipeBody = {

    title: string

    summary: string

    ingredients: string

    steps: string

    category: RecipeCategory

    prepMinutes: number

}


type UpdateRecipeBody = {

    title?: string

    summary?: string

    ingredients?: string

    steps?: string

    category?: RecipeCategory

    prepMinutes?: number

    status?: PublicationStatus

}


const recipeEnvelopeSchema = {

    type: 'object',

    properties: {

        message: { type: 'string' },

        data: recipeResponseSchema

    },

    required: ['message', 'data'],

    additionalProperties: false

} as const


const recipeRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * Fetch the signed-in member's favorite state for one page of recipes in
     * a single query. Anonymous visitors simply receive `isFavorite: false`.
     */

    async function favoriteIdsFor(
        userId: number,
        recipeIds: number[]
    ): Promise<Set<number>> {

        if (recipeIds.length === 0) {
            return new Set()
        }

        const rows = await fastify.prisma.favorite.findMany({

            where: {

                userId,

                recipeId: {
                    in: recipeIds
                }

            },

            select: {
                recipeId: true
            }

        })


        return new Set(rows.map((row) => row.recipeId))

    }


    /**
     * Public catalogue: published recipes with search, category filter,
     * maximum preparation time, and pagination. A valid token is optional so
     * the UI can show which recipes are already favorites.
     */

    fastify.get<{ Querystring: RecipeListQuery }>(
        '/recipes',

        {

            preHandler: [
                fastify.optionalAuthenticate
            ],

            schema: {

                querystring: recipeListQuerySchema,

                response: {

                    200: listResponseSchema(recipeResponseSchema)

                }

            }

        },

        async (request) => {

            const user = request.currentUser

            const query = request.query

            const { page, limit, skip } = resolvePagination(query)

            const search = query.search?.trim()


            const where = {

                status: 'PUBLISHED' as const,

                ...(search
                    ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' as const } },
                            { summary: { contains: search, mode: 'insensitive' as const } },
                            { ingredients: { contains: search, mode: 'insensitive' as const } }
                        ]
                    }
                    : {}),

                ...(query.category ? { category: query.category } : {}),

                ...(query.maxPrep
                    ? {
                        prepMinutes: {
                            lte: query.maxPrep
                        }
                    }
                    : {})

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


            const favoriteIds = user
                ? await favoriteIdsFor(
                    user.id,
                    rows.map((row) => row.id)
                )
                : new Set<number>()


            return {

                message: 'Recipes retrieved.',

                data: rows.map((row) =>
                    serializeRecipe(
                        row,
                        favoriteIds.has(row.id)
                    )
                ),

                pagination: buildPagination(page, limit, total)

            }

        }
    )


    /**
     * Chef studio: the signed-in chef's own recipes, drafts included.
     * Ownership is taken from the token, never from the query string.
     */

    fastify.get<{ Querystring: MyRecipesQuery }>(
        '/me/recipes',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('CHEF')
            ],

            schema: {

                querystring: myRecipesQuerySchema,

                response: {

                    200: listResponseSchema(recipeResponseSchema),

                    401: errorResponseSchema,

                    403: errorResponseSchema

                }

            }

        },

        async (request) => {

            const user = request.currentUser!

            const query = request.query

            const { page, limit, skip } = resolvePagination(query)

            const search = query.search?.trim()


            const where = {

                authorId: user.id,

                ...(search
                    ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' as const } },
                            { summary: { contains: search, mode: 'insensitive' as const } },
                            { ingredients: { contains: search, mode: 'insensitive' as const } }
                        ]
                    }
                    : {}),

                ...(query.status ? { status: query.status } : {}),

                ...(query.category ? { category: query.category } : {})

            }


            const [rows, total] = await Promise.all([

                fastify.prisma.recipe.findMany({

                    where,

                    select: recipeSelect,

                    orderBy: [
                        { updatedAt: 'desc' },
                        { id: 'desc' }
                    ],

                    skip,

                    take: limit

                }),

                fastify.prisma.recipe.count({ where })

            ])


            const favoriteIds = await favoriteIdsFor(
                user.id,
                rows.map((row) => row.id)
            )


            return {

                message: 'Your recipes retrieved.',

                data: rows.map((row) =>
                    serializeRecipe(
                        row,
                        favoriteIds.has(row.id)
                    )
                ),

                pagination: buildPagination(page, limit, total)

            }

        }
    )


    /**
     * Detail view. An optional token lets a chef open their own draft;
     * everyone else is restricted to published recipes. A draft that the
     * caller may not see must look exactly like a missing row (404).
     */

    fastify.get<{ Params: { id: number } }>(
        '/recipes/:id',

        {

            preHandler: [
                fastify.optionalAuthenticate
            ],

            schema: {

                params: recipeIdParamSchema,

                response: {

                    200: recipeEnvelopeSchema,

                    404: errorResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser

            const row = await fastify.prisma.recipe.findFirst({

                where: {

                    id: request.params.id,

                    ...recipeVisibilityWhere(user)

                },

                select: recipeSelect

            })


            if (!row) {

                return reply.code(404).send({
                    message: 'Recipe not found.'
                })

            }


            const favorite = user
                ? await fastify.prisma.favorite.findFirst({

                    where: {
                        userId: user.id,
                        recipeId: row.id
                    },

                    select: {
                        recipeId: true
                    }

                })
                : null


            return {

                message: 'Recipe retrieved.',

                data: serializeRecipe(
                    row,
                    Boolean(favorite)
                )

            }

        }
    )


    fastify.post<{ Body: CreateRecipeBody }>(
        '/recipes',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('CHEF')
            ],

            schema: {

                body: createRecipeSchema,

                response: {

                    201: recipeEnvelopeSchema,

                    401: errorResponseSchema,

                    403: errorResponseSchema,

                    400: errorResponseSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body


                for (const field of [
                    'title',
                    'summary',
                    'ingredients',
                    'steps'
                ] as const) {

                    if (typeof body?.[field] === 'string') {
                        body[field] = body[field].trim()
                    }

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const row = await fastify.prisma.recipe.create({

                data: {

                    ...request.body,

                    status: 'DRAFT',

                    authorId: user.id

                },

                select: recipeSelect

            })


            return reply.code(201).send({

                message: 'Recipe created as a draft.',

                data: serializeRecipe(row)

            })

        }
    )


    fastify.patch<{
        Params: { id: number }
        Body: UpdateRecipeBody
    }>(
        '/recipes/:id',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('CHEF')
            ],

            schema: {

                params: recipeIdParamSchema,

                body: updateRecipeSchema,

                response: {

                    200: recipeEnvelopeSchema,

                    401: errorResponseSchema,

                    403: errorResponseSchema,

                    404: errorResponseSchema,

                    400: errorResponseSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body


                for (const field of [
                    'title',
                    'summary',
                    'ingredients',
                    'steps'
                ] as const) {

                    if (typeof body?.[field] === 'string') {
                        body[field] = body[field].trim()
                    }

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const where = {

                id: request.params.id,

                authorId: user.id

            }


            const [updated] = await fastify.prisma.recipe
                .updateManyAndReturn({

                    where,

                    data: request.body,

                    select: recipeSelect

                })


            if (!updated) {

                return reply.code(404).send({
                    message: 'Recipe not found.'
                })

            }


            const statusChanged = request.body.status !== undefined


            return {

                message: statusChanged
                    ? 'Recipe publication status updated.'
                    : 'Recipe updated.',

                data: serializeRecipe(updated)

            }

        }
    )


    fastify.delete<{ Params: { id: number } }>(
        '/recipes/:id',

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

            const where = {

                id: request.params.id,

                authorId: user.id

            }


            const recipe = await fastify.prisma.recipe.findFirst({

                where,

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


            await fastify.prisma.recipe.delete({
                where: {
                    id: recipe.id
                }
            })


            if (recipe.photo) {

                await removeStoredObject(
                    recipe.photo.storageKey
                )

            }


            return reply.code(204).send()

        }
    )

}


export default recipeRoutes
