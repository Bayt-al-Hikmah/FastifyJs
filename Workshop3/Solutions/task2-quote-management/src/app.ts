import formbody from '@fastify/formbody'
import Fastify from 'fastify'

import prismaPlugin from './plugins/prisma.js'
import securityPlugin from './plugins/security.js'
import staticFilesPlugin from './plugins/static.js'
import viewsPlugin from './plugins/views.js'

import quoteRoutes from './routes/quotes.js'

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

export function buildApp() {
    const fastify = Fastify({
        logger: true
    })

    fastify.register(viewsPlugin)
    fastify.register(staticFilesPlugin)
    fastify.register(formbody)
    fastify.register(securityPlugin)
    fastify.register(prismaPlugin)
    fastify.register(quoteRoutes)

    fastify.setNotFoundHandler(async (request, reply) => {
        return reply.code(404).viewAsync('404', {
            title: 'Page not found'
        })
    })

    fastify.setErrorHandler(
        async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
            request.log.error(error)

            if (reply.sent) {
                return
            }

            const statusCode = error.statusCode ?? 500

            if (statusCode === 404) {
                return reply.code(404).viewAsync('404', {
                    title: 'Page not found'
                })
            }

            if (statusCode >= 400 && statusCode < 500) {
                return reply.code(statusCode).viewAsync('error', {
                    title: 'Request could not be completed',
                    statusCode,
                    message: 'The request was not valid. Please go back and try again.'
                })
            }

            return reply.code(500).viewAsync('error', {
                title: 'Something went wrong',
                statusCode: 500,
                message: 'An unexpected error occurred. Please try again later.'
            })
        }
    )

    return fastify
}
