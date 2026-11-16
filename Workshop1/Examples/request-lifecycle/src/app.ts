import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'

import encapsulatedRoutes from './plugins/encapsulated.js'
import lifecyclePlugin from './plugins/lifecycle.js'
import demoRoutes from './routes/demo.js'

export function buildApp(): FastifyInstance {

    const fastify = Fastify({
        logger: true
    })

    // Register the hooks first so every route below participates in the lifecycle.
    fastify.register(lifecyclePlugin)

    // Return a safe error body instead of exposing an internal message or stack.
    fastify.setErrorHandler((error: FastifyError, request, reply) => {

        if (error.validation) {

            return reply.code(400).send({
                error: 'Request validation failed'
            })

        }

        request.log.error({ err: error }, 'request failed')

        return reply.code(500).send({
            error: 'Internal Server Error'
        })

    })

    fastify.get(
        '/',
        {
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            lifecycle: {
                                type: 'array',
                                items: { type: 'string' }
                            },
                            hint: { type: 'string' }
                        },
                        required: ['message', 'lifecycle', 'hint'],
                        additionalProperties: false
                    }
                }
            }
        },
        async (request) => {

            return {
                message: 'Request lifecycle example',
                lifecycle: [...request.lifecycle],
                hint: 'Inspect the X-Lifecycle and X-Response-Time response headers.'
            }

        }
    )

    fastify.register(demoRoutes, { prefix: '/api' })
    fastify.register(encapsulatedRoutes, { prefix: '/api' })

    return fastify

}
