import type { FastifyPluginAsync } from 'fastify'

import { isPrismaError } from '../lib/prisma-errors.js'


type UpdateProfileBody = {
    name?: string
    email?: string
}


const currentUserSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        name: { type: 'string' },

        email: { type: 'string' },

        role: {
            type: 'string',
            enum: ['USER', 'ADMIN']
        }

    },

    required: [
        'id',
        'name',
        'email',
        'role'
    ],

    additionalProperties: false

} as const


const publicUserSchema = {

    type: 'object',

    properties: {

        id: { type: 'integer' },

        name: { type: 'string' },

        email: { type: 'string' },

        role: {
            type: 'string',
            enum: ['USER', 'ADMIN']
        },

        createdAt: {
            type: 'string',
            format: 'date-time'
        }

    },

    required: [
        'id',
        'name',
        'email',
        'role',
        'createdAt'
    ],

    additionalProperties: false

} as const


const updateProfileSchema = {

    type: 'object',

    minProperties: 1,

    properties: {

        name: {
            type: 'string',
            minLength: 2,
            maxLength: 80,
            pattern: '\\S'
        },

        email: {
            type: 'string',
            format: 'email',
            maxLength: 254
        }

    },

    // "role" and every other field are rejected rather than ignored.
    // Users can never promote themselves through this endpoint.

    additionalProperties: false

} as const


const userRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get(
        '/me',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                response: {

                    200: currentUserSchema

                }

            }

        },

        async (request) => {

            return request.currentUser

        }
    )


    fastify.patch<{ Body: UpdateProfileBody }>(
        '/me',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                body: updateProfileSchema,

                response: {

                    200: {

                        type: 'object',

                        properties: {

                            message: { type: 'string' },

                            user: publicUserSchema

                        },

                        required: ['message', 'user'],

                        additionalProperties: false

                    }

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.name === 'string') {
                    body.name = body.name.trim()
                }

                if (typeof body?.email === 'string') {
                    body.email = body.email.trim().toLowerCase()
                }

            }

        },

        async (request, reply) => {

            const user = request.currentUser!

            try {

                const updatedUser = await fastify.prisma.user.update({

                    where: {
                        id: user.id
                    },

                    data: request.body,

                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        createdAt: true
                    }

                })


                // Keep the request-scoped identity in sync so any
                // subsequent hook in this request sees the new values.

                request.currentUser = {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role
                }


                return reply.code(200).send({

                    message: 'Profile updated successfully',

                    user: updatedUser

                })

            } catch (error) {

                if (isPrismaError(error, 'P2002')) {

                    return reply.code(409).send({
                        error: 'An account with this email already exists'
                    })

                }

                if (isPrismaError(error, 'P2025')) {

                    return reply
                        .header('WWW-Authenticate', 'Bearer')
                        .code(401)
                        .send({
                            error: 'Account no longer exists'
                        })

                }

                throw error

            }

        }
    )

}


export default userRoutes
