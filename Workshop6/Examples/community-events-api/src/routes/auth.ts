import type { FastifyPluginAsync } from 'fastify'

import {
    loginHandler,
    meHandler,
    registerHandler
} from '../controllers/auth-controller.js'

import {
    loginBodySchema,
    registerBodySchema
} from '../schemas/auth-schemas.js'

import type {
    LoginInput,
    RegisterInput
} from '../services/auth-service.js'


const authRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.post<{ Body: RegisterInput }>(
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


                if (typeof body?.username === 'string') {
                    body.username = body.username.trim()
                }

                if (typeof body?.email === 'string') {
                    body.email = body.email
                        .trim()
                        .toLowerCase()
                }

                if (body?.role === undefined) {
                    body.role = 'MEMBER'
                }

            }

        },

        registerHandler
    )


    fastify.post<{ Body: LoginInput }>(
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
                    body.email = body.email
                        .trim()
                        .toLowerCase()
                }

            }

        },

        loginHandler
    )


    fastify.get(
        '/me',

        {
            preHandler: [
                fastify.authenticate
            ]
        },

        meHandler
    )

}


export default authRoutes
