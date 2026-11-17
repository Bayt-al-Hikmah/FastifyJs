import type { FastifyPluginAsync } from 'fastify'

import { randomBytes } from 'node:crypto'

import { hashPassword, verifyPassword } from '../lib/password.js'
import { isPrismaError } from '../lib/prisma-errors.js'

import {
    authErrorResponseSchema,
    loginResponseSchema,
    loginSchema,
    meResponseSchema,
    registerResponseSchema,
    registerSchema
} from '../schemas/auth-schemas.js'

import type { UserRole } from '../types/auth.js'


type RegisterBody = {

    name: string

    email: string

    password: string

    role?: UserRole

}


type LoginBody = {

    email: string

    password: string

}


const authRoutes: FastifyPluginAsync = async (fastify) => {

    /**
     * A pre-computed hash used when an email does not exist. Verifying against
     * it keeps the response time similar for known and unknown accounts,
     * reducing email enumeration through timing.
     */

    const dummyPasswordHash = await hashPassword(
        randomBytes(32).toString('hex')
    )


    fastify.post<{ Body: RegisterBody }>(
        '/register',

        {

            schema: {

                body: registerSchema,

                response: {

                    201: registerResponseSchema,

                    409: authErrorResponseSchema,

                    400: authErrorResponseSchema

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

            const role: UserRole = request.body.role ?? 'STUDENT'

            const passwordHash = await hashPassword(password)


            try {

                const user = await fastify.prisma.user.create({

                    data: {
                        name,
                        email,
                        passwordHash,
                        role
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

                    message: 'Account created successfully.',

                    data: { user }

                })

            } catch (error) {

                if (isPrismaError(error, 'P2002')) {

                    return reply.code(409).send({
                        message: 'An account with this email already exists.'
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

                    200: loginResponseSchema,

                    401: authErrorResponseSchema,

                    400: authErrorResponseSchema

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


            const passwordHash = user?.passwordHash ?? dummyPasswordHash

            const passwordValid = await verifyPassword(
                passwordHash,
                password
            )


            if (!user || !passwordValid) {

                return reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        message: 'Invalid email or password.'
                    })

            }


            const accessToken = await reply.jwtSign({
                sub: String(user.id)
            })


            return reply.code(200).send({

                message: 'Login successful.',

                data: {

                    accessToken,

                    tokenType: 'Bearer',

                    expiresIn: 900,

                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }

                }

            })

        }
    )


    fastify.get(
        '/me',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                response: {

                    200: meResponseSchema,

                    401: authErrorResponseSchema

                }

            }

        },

        async (request) => {

            const user = request.currentUser!

            const profile = await fastify.prisma.user.findUnique({

                where: {
                    id: user.id
                },

                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true
                }

            })


            return {

                message: 'Profile retrieved.',

                data: { user: profile }

            }

        }
    )

}


export default authRoutes
