import Fastify from 'fastify'
import type { FastifyError, FastifyInstance } from 'fastify'
import formbody from '@fastify/formbody'

import viewsPlugin from './plugins/views.js'
import staticPlugin from './plugins/static.js'
import securityPlugin from './plugins/security.js'
import quoteStorePlugin from './plugins/quote-store.js'

import homeRoutes from './routes/home.js'
import quoteRoutes from './routes/quotes.js'
import searchRoutes from './routes/search.js'
import dashboardRoutes from './routes/dashboard.js'

export function buildApp(): FastifyInstance {
    const fastify = Fastify({
        logger: true
    })

    fastify.register(viewsPlugin)
    fastify.register(staticPlugin)

    // HTML forms arrive as application/x-www-form-urlencoded.
    fastify.register(formbody)

    // Cookie parsing must be ready before the CSRF plugin reads its secret.
    fastify.register(securityPlugin)

    fastify.register(quoteStorePlugin)

    fastify.register(homeRoutes)
    fastify.register(quoteRoutes)
    fastify.register(searchRoutes)
    fastify.register(dashboardRoutes)

    fastify.setNotFoundHandler(async (_request, reply) => {
        return reply.code(404).viewAsync('not-found', {
            title: 'Page not found',
            message: 'The page you are looking for does not exist.'
        })
    })

    fastify.setErrorHandler((error: FastifyError, request, reply) => {
        request.log.error({ err: error }, 'Unhandled request error')

        const statusCode =
            error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500
                ? error.statusCode
                : 500

        const message =
            statusCode === 404
                ? 'The page you are looking for does not exist.'
                : 'Something went wrong while preparing this page. Please try again.'

        return reply.code(statusCode).viewAsync('error', {
            title: 'Something went wrong',
            message
        })
    })

    return fastify
}
