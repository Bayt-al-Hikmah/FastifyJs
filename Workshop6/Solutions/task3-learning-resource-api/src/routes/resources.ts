import type { FastifyPluginAsync } from 'fastify'

import type { Prisma } from '../generated/prisma/client.js'

import {
    errorResponseSchema,
    listResponseSchema,
    resourceIdParamSchema
} from '../schemas/common-schemas.js'

import {
    createResourceSchema,
    myResourcesQuerySchema,
    resourceListQuerySchema,
    resourceResponseSchema,
    updateResourceSchema
} from '../schemas/resource-schemas.js'

import {
    buildPagination,
    resolvePagination,
    type PaginationQuery
} from '../lib/pagination.js'

import {
    resourceSelect,
    serializeResource
} from '../lib/serializers.js'

import { removeStoredObject } from '../lib/storage-files.js'

import { resourceVisibilityWhere } from '../lib/visibility.js'


type ResourceType = 'VIDEO' | 'ARTICLE' | 'BOOK' | 'EXERCISE'

type PublicationStatus = 'DRAFT' | 'PUBLISHED'


type ResourceListQuery = PaginationQuery & {

    search?: string

    subject?: string

    type?: ResourceType

}


type MyResourcesQuery = PaginationQuery & {

    search?: string

    status?: PublicationStatus

    type?: ResourceType

}


type CreateResourceBody = {

    title: string

    description: string

    subject: string

    type: ResourceType

}


type UpdateResourceBody = {

    title?: string

    description?: string

    subject?: string

    type?: ResourceType

    status?: PublicationStatus

}


const resourceRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * Distinct subjects used to populate the catalogue filter. It exposes only
     * published subjects, so a draft's topic never leaks through metadata.
     */

    fastify.get(
        '/resources/subjects',

        {

            schema: {

                response: {

                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            data: {
                                type: 'object',
                                properties: {
                                    subjects: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    }
                                },
                                required: ['subjects'],
                                additionalProperties: false
                            }
                        },
                        required: ['message', 'data'],
                        additionalProperties: false
                    }

                }

            }

        },

        async () => {

            const rows = await fastify.prisma.resource.findMany({

                where: {
                    status: 'PUBLISHED'
                },

                select: {
                    subject: true
                },

                distinct: ['subject'],

                orderBy: {
                    subject: 'asc'
                }

            })


            return {

                message: 'Subjects retrieved.',

                data: {
                    subjects: rows.map((row) => row.subject)
                }

            }

        }
    )


    /**
     * Public catalogue: published resources with search, subject filter,
     * type filter, and pagination.
     */

    fastify.get<{ Querystring: ResourceListQuery }>(
        '/resources',

        {

            schema: {

                querystring: resourceListQuerySchema,

                response: {

                    200: listResponseSchema(resourceResponseSchema)

                }

            }

        },

        async (request) => {

            const query = request.query

            const { page, limit, skip } = resolvePagination(query)

            const search = query.search?.trim()

            const where: Prisma.ResourceWhereInput = {

                status: 'PUBLISHED',

                ...(search
                    ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                            { subject: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                    : {}),

                ...(query.subject
                    ? {
                        subject: {
                            equals: query.subject,
                            mode: 'insensitive'
                        }
                    }
                    : {}),

                ...(query.type ? { type: query.type } : {})

            }


            const [rows, total] = await Promise.all([

                fastify.prisma.resource.findMany({

                    where,

                    select: resourceSelect,

                    orderBy: [
                        { createdAt: 'desc' },
                        { id: 'desc' }
                    ],

                    skip,

                    take: limit

                }),

                fastify.prisma.resource.count({ where })

            ])


            return {

                message: 'Resources retrieved.',

                data: rows.map(serializeResource),

                pagination: buildPagination(page, limit, total)

            }

        }
    )


    /**
     * Instructor studio: the signed-in instructor's own resources, drafts
     * included. Ownership is taken from the token, never from the query.
     */

    fastify.get<{ Querystring: MyResourcesQuery }>(
        '/me/resources',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('INSTRUCTOR')
            ],

            schema: {

                querystring: myResourcesQuerySchema,

                response: {

                    200: listResponseSchema(resourceResponseSchema),

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

            const where: Prisma.ResourceWhereInput = {

                instructorId: user.id,

                ...(search
                    ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                            { subject: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                    : {}),

                ...(query.status ? { status: query.status } : {}),

                ...(query.type ? { type: query.type } : {})

            }


            const [rows, total] = await Promise.all([

                fastify.prisma.resource.findMany({

                    where,

                    select: resourceSelect,

                    orderBy: [
                        { createdAt: 'desc' },
                        { id: 'desc' }
                    ],

                    skip,

                    take: limit

                }),

                fastify.prisma.resource.count({ where })

            ])


            return {

                message: 'Your resources retrieved.',

                data: rows.map(serializeResource),

                pagination: buildPagination(page, limit, total)

            }

        }
    )


    /**
     * Detail view. An optional token lets an instructor open their own draft;
     * everyone else is restricted to published resources. A draft that the
     * caller may not see must look exactly like a missing row (404).
     */

    fastify.get<{ Params: { id: number } }>(
        '/resources/:id',

        {

            preHandler: [
                fastify.optionalAuthenticate
            ],

            schema: {

                params: resourceIdParamSchema,

                response: {

                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            data: resourceResponseSchema
                        },
                        required: ['message', 'data'],
                        additionalProperties: false
                    },

                    404: errorResponseSchema

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser

            const row = await fastify.prisma.resource.findFirst({

                where: {

                    id: request.params.id,

                    ...resourceVisibilityWhere(user)

                },

                select: resourceSelect

            })


            if (!row) {

                return reply.code(404).send({
                    message: 'Resource not found.'
                })

            }


            return {

                message: 'Resource retrieved.',

                data: serializeResource(row)

            }

        }
    )


    fastify.post<{ Body: CreateResourceBody }>(
        '/resources',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('INSTRUCTOR')
            ],

            schema: {

                body: createResourceSchema,

                response: {

                    201: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            data: resourceResponseSchema
                        },
                        required: ['message', 'data'],
                        additionalProperties: false
                    },

                    401: errorResponseSchema,

                    403: errorResponseSchema,

                    400: errorResponseSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body


                for (const field of ['title', 'description', 'subject'] as const) {

                    if (typeof body?.[field] === 'string') {
                        body[field] = body[field].trim()
                    }

                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            const row = await fastify.prisma.resource.create({

                data: {

                    ...request.body,

                    status: 'DRAFT',

                    instructorId: user.id

                },

                select: resourceSelect

            })


            return reply.code(201).send({

                message: 'Resource created as a draft.',

                data: serializeResource(row)

            })

        }
    )


    fastify.patch<{
        Params: { id: number }
        Body: UpdateResourceBody
    }>(
        '/resources/:id',

        {

            preHandler: [
                fastify.authenticate,
                fastify.authorize('INSTRUCTOR')
            ],

            schema: {

                params: resourceIdParamSchema,

                body: updateResourceSchema,

                response: {

                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            data: resourceResponseSchema
                        },
                        required: ['message', 'data'],
                        additionalProperties: false
                    },

                    401: errorResponseSchema,

                    403: errorResponseSchema,

                    404: errorResponseSchema,

                    400: errorResponseSchema

                }

            },

            preValidation: async (request) => {

                const body = request.body


                for (const field of ['title', 'description', 'subject'] as const) {

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

                instructorId: user.id

            }


            const [updated] = await fastify.prisma.resource
                .updateManyAndReturn({

                    where,

                    data: request.body,

                    select: resourceSelect

                })


            if (!updated) {

                return reply.code(404).send({
                    message: 'Resource not found.'
                })

            }


            const statusChanged = request.body.status !== undefined


            return {

                message: statusChanged
                    ? 'Resource publication status updated.'
                    : 'Resource updated.',

                data: serializeResource(updated)

            }

        }
    )


    fastify.delete<{ Params: { id: number } }>(
        '/resources/:id',

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

            const where = {

                id: request.params.id,

                instructorId: user.id

            }


            const resource = await fastify.prisma.resource.findFirst({

                where,

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


            await fastify.prisma.resource.delete({
                where: {
                    id: resource.id
                }
            })


            if (resource.attachment) {

                await removeStoredObject(
                    resource.attachment.storageKey
                )

            }


            return reply.code(204).send()

        }
    )

}


export default resourceRoutes
