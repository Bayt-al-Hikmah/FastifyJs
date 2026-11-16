import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'

import multipart from '@fastify/multipart'

import viewsPlugin from './plugins/views.js'
import staticPlugin from './plugins/static.js'

import pagesRoutes from './routes/pages.js'
import apiRoutes from './routes/api.js'

import { MULTIPART_HARD_LIMIT } from './config/uploads.js'

export function buildApp(): FastifyInstance {
    const fastify = Fastify({
        logger: true
    })

    fastify.register(viewsPlugin)
    fastify.register(staticPlugin)

    fastify.register(multipart, {
        throwFileSizeLimit: false,

        limits: {
            fieldNameSize: 100,
            fieldSize: 1024,
            fields: 0,
            files: 1,
            // The UploadMeter enforces 10 MB; this is a parser-level backstop.
            fileSize: MULTIPART_HARD_LIMIT,
            headerPairs: 100,
            parts: 1
        }
    })

    fastify.register(pagesRoutes)
    fastify.register(apiRoutes, {
        prefix: '/api'
    })

    fastify.setNotFoundHandler(async (request, reply) => {
        if (request.url.startsWith('/api/')) {
            return reply.code(404).send({
                error: 'Route not found.'
            })
        }

        return reply.code(404).viewAsync('not-found', {
            title: 'Page not found',
            description: 'The requested page does not exist.',
            message: 'This stream does not lead anywhere.',
            isHome: false
        })
    })

    fastify.setErrorHandler((error: FastifyError, request, reply) => {
        const statusCode =
            error.statusCode && error.statusCode >= 400
                ? error.statusCode
                : 500

        if (statusCode >= 500) {
            request.log.error(error)
        }

        if (reply.sent) {
            return
        }

        if (request.url.startsWith('/api/')) {
            return reply.code(statusCode).send({
                error:
                    statusCode >= 500
                        ? 'Internal server error.'
                        : error.message
            })
        }

        return reply.code(statusCode).viewAsync('error', {
            title: 'Stream interrupted',
            description: 'An unexpected condition occurred.',
            statusCode,
            message:
                statusCode >= 500
                    ? 'The server could not complete the request. Try again in a moment.'
                    : 'The request was rejected before it reached the storage pipeline.',
            isHome: false
        })
    })

    return fastify
}
