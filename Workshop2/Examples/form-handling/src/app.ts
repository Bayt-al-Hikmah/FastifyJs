import Fastify from 'fastify'
import type { FastifyError, FastifyInstance } from 'fastify'
import formbody from '@fastify/formbody'

import viewsPlugin from './plugins/views.js'
import staticPlugin from './plugins/static.js'
import messageStorePlugin from './plugins/message-store.js'
import guestbookRoutes from './routes/guestbook.js'

export function buildApp(): FastifyInstance {
    const fastify = Fastify({
        logger: true
    })

    fastify.register(viewsPlugin)
    fastify.register(staticPlugin)

    // HTML forms are submitted as application/x-www-form-urlencoded.
    fastify.register(formbody)

    fastify.register(messageStorePlugin)
    fastify.register(guestbookRoutes)

    fastify.setNotFoundHandler(async (_request, reply) => {
        return reply.code(404).viewAsync('not-found', {
            title: 'Page not found',
            description: 'The requested page does not exist.'
        })
    })

    fastify.setErrorHandler((error: FastifyError, request, reply) => {
        request.log.error({ err: error }, 'Unhandled request error')

        return reply.code(500).viewAsync('error', {
            title: 'Something went wrong',
            description: 'An unexpected error occurred.'
        })
    })

    return fastify
}
