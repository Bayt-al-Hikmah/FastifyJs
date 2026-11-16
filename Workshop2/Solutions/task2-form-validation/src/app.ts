import Fastify from 'fastify'
import type { FastifyError, FastifyInstance, FastifyRequest } from 'fastify'
import formbody from '@fastify/formbody'

import viewsPlugin from './plugins/views.js'
import staticPlugin from './plugins/static.js'
import securityPlugin from './plugins/security.js'
import pitchStorePlugin from './plugins/pitch-store.js'
import pitchRoutes from './routes/pitch.js'


export function buildApp(): FastifyInstance {

    const fastify = Fastify({

        logger: true,

        // Report every invalid field, not just the first one Ajv finds.
        ajv: {

            customOptions: {

                allErrors: true

            }

        }

    })


    fastify.register(viewsPlugin)

    fastify.register(staticPlugin)

    // HTML forms arrive as application/x-www-form-urlencoded.
    fastify.register(formbody)

    // Cookies and CSRF protection must be ready before protected routes.
    fastify.register(securityPlugin)

    fastify.register(pitchStorePlugin)

    fastify.register(pitchRoutes)


    fastify.setNotFoundHandler(async (_request, reply) => {

        return reply.code(404).viewAsync('not-found', {

            title: 'Page not found',

            description: 'The page you requested is not part of this issue.'

        })

    })


    fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply) => {

        // The CSRF plugin rejects requests without a valid token with 403.
        if (error.statusCode === 403) {

            request.log.warn({ code: error.code }, 'Blocked request')

            return reply.code(403).viewAsync('forbidden', {

                title: 'Submission blocked',

                description: 'The security token was missing, expired, or did not match this browser session. Reload the form and send the pitch again.'

            })

        }

        request.log.error({ err: error }, 'Unhandled request error')

        return reply.code(error.statusCode ?? 500).viewAsync('error', {

            title: 'Something went wrong',

            description: 'The pitch could not be processed. Please try again in a moment.'

        })

    })


    return fastify

}
