import Fastify, { type FastifyInstance } from 'fastify'

import requestLogger from './plugins/request-logger.js'
import demoRoutes from './routes/demo.js'
import itemsRoutes from './routes/items.js'

export function buildApp(): FastifyInstance {

    const fastify = Fastify({
        logger: true
    })

    // Register the reusable plugin before the routes so its hooks cover them.
    fastify.register(requestLogger, {
        headerName: 'x-response-time'
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
                            endpoints: {
                                type: 'array',
                                items: { type: 'string' }
                            }
                        },
                        required: ['message', 'endpoints'],
                        additionalProperties: false
                    }
                }
            }
        },
        async () => {

            return {
                message: 'Request logger demo',
                endpoints: [
                    'GET /api/items',
                    'GET /api/items/:itemId',
                    'GET /api/demo/slow'
                ]
            }

        }
    )

    fastify.register(itemsRoutes, { prefix: '/api' })
    fastify.register(demoRoutes, { prefix: '/api' })

    return fastify

}
