import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

import { env } from '../config/env.js'

import type { FastifyPluginAsync } from 'fastify'

import type { UserRole } from '../types/auth.js'


const numericIdPattern = /^[1-9]\d*$/


const authPlugin: FastifyPluginAsync = async (fastify) => {

    fastify.register(jwt, {

        secret: env.jwtSecret,

        sign: {
            algorithm: 'HS256',
            iss: env.jwtIssuer,
            expiresIn: '15m'
        },

        verify: {
            algorithms: ['HS256'],
            allowedIss: env.jwtIssuer
        }

    })


    fastify.decorateRequest('currentUser', null)


    fastify.decorate(
        'authenticate',
        async (request, reply): Promise<void> => {

            try {

                await request.jwtVerify()

            } catch {

                reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        message: 'Invalid or missing access token.'
                    })

                return

            }


            const subject = request.user.sub


            if (!numericIdPattern.test(subject)) {

                reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        message: 'Invalid access token.'
                    })

                return

            }


            const userId = Number(subject)


            if (
                !Number.isSafeInteger(userId) ||
                userId <= 0 ||
                userId > 2_147_483_647
            ) {

                reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        message: 'Invalid access token.'
                    })

                return

            }


            const user = await fastify.prisma.user.findUnique({

                where: {
                    id: userId
                },

                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true
                }

            })


            if (!user) {

                reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        message: 'Invalid authentication credentials.'
                    })

                return

            }


            request.currentUser = user

        }
    )


    fastify.decorate('authorize', (...allowedRoles: UserRole[]) => {

        return async (request, reply): Promise<void> => {

            const user = request.currentUser


            if (!user) {

                reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        message: 'Authentication required.'
                    })

                return

            }


            if (!allowedRoles.includes(user.role)) {

                reply.code(403).send({
                    message: 'You do not have permission to perform this action.'
                })

                return

            }

        }

    })

}


export default fp(authPlugin, {

    name: 'auth'

})
