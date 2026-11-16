import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

import type { FastifyPluginAsync } from 'fastify'

import type { UserRole } from '../types/auth.js'


const authPlugin: FastifyPluginAsync = async (fastify) => {

    const secret = process.env.JWT_SECRET

    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
        throw new Error('A valid JWT_SECRET is required')
    }


    fastify.register(jwt, {

        secret,

        sign: {
            algorithm: 'HS256',
            expiresIn: '15m'
        },

        verify: {
            algorithms: ['HS256']
        }

    })


    fastify.decorateRequest('currentUser', null)


    fastify.decorate('authenticate', async (request, reply): Promise<void> => {

        try {

            await request.jwtVerify()

        } catch {

            reply
                .header('WWW-Authenticate', 'Bearer')
                .code(401)
                .send({
                    error: 'Invalid or missing access token'
                })

            return

        }


        const subject = request.user.sub

        if (!/^[1-9]\d*$/.test(subject)) {

            reply
                .header('WWW-Authenticate', 'Bearer')
                .code(401)
                .send({
                    error: 'Invalid access token'
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
                    error: 'Invalid access token'
                })

            return

        }


        const user = await fastify.prisma.user.findUnique({

            where: {
                id: userId
            },

            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }

        })


        if (!user) {

            reply
                .header('WWW-Authenticate', 'Bearer')
                .code(401)
                .send({
                    error: 'Invalid authentication credentials'
                })

            return

        }


        request.currentUser = user

    })


    fastify.decorate('authorize', (...allowedRoles: UserRole[]) => {

        return async (request, reply): Promise<void> => {

            const user = request.currentUser

            if (!user) {

                reply
                    .header('WWW-Authenticate', 'Bearer')
                    .code(401)
                    .send({
                        error: 'Authentication required'
                    })

                return

            }

            if (!allowedRoles.includes(user.role)) {

                reply.code(403).send({
                    error: 'You do not have permission to access this resource'
                })

                return

            }

        }

    })

}


export default fp(authPlugin, {

    name: 'auth'

})
