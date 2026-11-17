import type { FastifyPluginAsync } from 'fastify'

import { randomBytes } from 'node:crypto'

import { hashPassword, verifyPassword } from '../lib/password.js'
import { isPrismaError } from '../lib/prisma-errors.js'
import { roleForEmail } from '../lib/roles.js'

import {
    loginBodySchema,
    registerBodySchema
} from '../schemas/auth.js'


type RegisterBody = {
    name: string
    email: string
    password: string
}

type LoginBody = {
    email: string
    password: string
}


const authRoutes: FastifyPluginAsync = async (fastify) => {

    // Hashing a dummy password on startup keeps login timings similar for
    // existing and non-existing accounts, which avoids user enumeration.
    const dummyPasswordHash = await hashPassword(
        randomBytes(32).toString('hex')
    )


    fastify.post<{ Body: RegisterBody }>(
        '/register',

        {
            schema: {
                body: registerBodySchema
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

            const role = roleForEmail(email)


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

                    data: {
                        user
                    }

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
                body: loginBodySchema
            },

            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: '15 minutes'
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
                        message: 'The email or password is incorrect.'
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
            ]
        },

        async (request, reply) => {

            return reply.code(200).send({

                message: 'Profile retrieved successfully.',

                data: {
                    user: request.currentUser
                }

            })

        }
    )

}


export default authRoutes
