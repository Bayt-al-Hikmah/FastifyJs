import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

import type { FastifyPluginAsync } from 'fastify'

import type { UserRole } from '../types/auth.js'


const authPlugin: FastifyPluginAsync = async (fastify) => {

    const secret = process.env.JWT_SECRET


    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {

        throw new Error('A valid JWT_SECRET of at least 32 bytes is required')

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


    /**
     * Verify the token, check that `sub` is a safe positive integer, load the
     * account from Prisma, and expose a minimal identity on the request.
     * Ownership is always derived from this value, never from request data.
     */

    fastify.decorate('authenticate', async (request, reply): Promise<void> => {

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


        if (!/^[1-9]\d*$/.test(subject)) {

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
                    message: 'Invalid authentication credentials.'
                })

            return

        }


        request.currentUser = user

    })


    /**
     * Public routes use this when a signed-in instructor should additionally
     * see their own drafts. A missing token is fine; an invalid one is not.
     */

    fastify.decorate(
        'optionalAuthenticate',
        async (request, reply): Promise<void> => {

            const authorization = request.headers.authorization


            if (
                !authorization ||
                !authorization.startsWith('Bearer ')
            ) {

                request.currentUser = null

                return

            }


            await fastify.authenticate(request, reply)

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
                        message: 'Authentication is required.'
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
