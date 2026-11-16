import type { FastifyPluginAsync } from 'fastify'

import { randomBytes } from 'node:crypto'

import { hashPassword, verifyPassword } from '../lib/password.js'
import { isPrismaError } from '../lib/prisma-errors.js'


type RegisterBody = {
    name: string
    email: string
    password: string
}

type LoginBody = {
    email: string
    password: string
}


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


const loginUserSchema = {

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


const errorSchema = {

    type: 'object',

    properties: {

        error: { type: 'string' }

    },

    required: ['error'],

    additionalProperties: false

} as const


const registerSchema = {

    type: 'object',

    required: ['name', 'email', 'password'],

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
        },

        password: {
            type: 'string',
            minLength: 15,
            maxLength: 128
        }

    },

    additionalProperties: false

} as const


const loginSchema = {

    type: 'object',

    required: ['email', 'password'],

    properties: {

        email: {
            type: 'string',
            format: 'email',
            maxLength: 254
        },

        password: {
            type: 'string',
            minLength: 1,
            maxLength: 128
        }

    },

    additionalProperties: false

} as const


const authRoutes: FastifyPluginAsync = async (fastify) => {

    const dummyPasswordHash = await hashPassword(
        randomBytes(32).toString('hex')
    )


    fastify.post<{ Body: RegisterBody }>(
        '/register',

        {

            schema: {

                body: registerSchema,

                response: {

                    201: {

                        type: 'object',

                        properties: {

                            message: { type: 'string' },

                            user: publicUserSchema

                        },

                        required: ['message', 'user'],

                        additionalProperties: false

                    },

                    409: errorSchema

                }

            },

            config: {

                rateLimit: {

                    max: 3,

                    timeWindow: '1 hour'

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

            const { name, email, password } = request.body

            const passwordHash = await hashPassword(password)

            try {

                const user = await fastify.prisma.user.create({

                    data: {
                        name,
                        email,
                        passwordHash
                    },

                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        createdAt: true
                    }

                })

                return reply.code(201).send({

                    message: 'Account created successfully',

                    user

                })

            } catch (error) {

                if (isPrismaError(error, 'P2002')) {

                    return reply.code(409).send({
                        error: 'An account with this email already exists'
                    })

                }

                throw error

            }

        }
    )


    fastify.post<{ Body: LoginBody }>(
        '/login',

        {

            schema: {

                body: loginSchema,

                response: {

                    200: {

                        type: 'object',

                        properties: {

                            message: { type: 'string' },

                            accessToken: { type: 'string' },

                            tokenType: { type: 'string' },

                            expiresIn: { type: 'integer' },

                            user: loginUserSchema

                        },

                        required: [
                            'message',
                            'accessToken',
                            'tokenType',
                            'expiresIn',
                            'user'
                        ],

                        additionalProperties: false

                    },

                    401: errorSchema

                }

            },

            config: {

                rateLimit: {

                    max: 5,

                    timeWindow: '1 minute'

                }

            },

            preValidation: async (request) => {

                const body = request.body

                if (typeof body?.email === 'string') {
                    body.email = body.email.trim().toLowerCase()
                }

            }

        },

        async (request, reply) => {

            const { email, password } = request.body

            const user = await fastify.prisma.user.findUnique({

                where: {
                    email
                }

            })


            const passwordHash =
                user?.passwordHash ?? dummyPasswordHash

            const passwordValid = await verifyPassword(
                passwordHash,
                password
            )


            if (!user || !passwordValid) {

                return reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        error: 'Invalid email or password'
                    })

            }


            const accessToken = await reply.jwtSign({
                sub: String(user.id)
            })


            return reply.code(200).send({

                message: 'Login successful',

                accessToken,

                tokenType: 'Bearer',

                expiresIn: 900,

                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }

            })

        }
    )

}


export default authRoutes
