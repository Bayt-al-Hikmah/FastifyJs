import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'

import multipart from '@fastify/multipart'

import viewsPlugin from './plugins/views.js'
import staticPlugin from './plugins/static.js'

import homeRoutes from './routes/home.js'
import filesRoutes from './routes/files.js'

import { MAX_UPLOAD_BYTES } from './config/uploads.js'

export function buildApp(): FastifyInstance {
    const fastify = Fastify({
        logger: true
    })

    fastify.register(viewsPlugin)
    fastify.register(staticPlugin)

    // One file field, no extra fields, and a hard 2 MB per-file limit.
    // The route also checks the stream for truncation and stored size.
    fastify.register(multipart, {
        throwFileSizeLimit: false,

        limits: {
            fieldNameSize: 100,
            fieldSize: 1024,
            fields: 0,
            files: 1,
            fileSize: MAX_UPLOAD_BYTES,
            headerPairs: 100,
            parts: 1
        }
    })

    fastify.register(homeRoutes)
    fastify.register(filesRoutes)

    fastify.setNotFoundHandler(async (_request, reply) => {
        return reply.code(404).viewAsync('not-found', {
            title: 'Page not found',
            description: 'The requested page does not exist.',
            message: 'The cabinet has no drawer with that label.',
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

        const messages: Record<number, string> = {
            400: 'The request could not be understood. Check the form and try again.',
            413: 'The upload was larger than the permitted 2 MB limit.',
            415: 'That file type is not supported by this cabinet.'
        }

        return reply.code(statusCode).viewAsync('error', {
            title: 'Something went wrong',
            description: 'An unexpected condition occurred.',
            statusCode,
            message:
                messages[statusCode] ??
                'The request could not be completed. Please try again.',
            isHome: false
        })
    })

    return fastify
}
