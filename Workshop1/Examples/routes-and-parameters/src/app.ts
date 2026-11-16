import Fastify, { type FastifyInstance } from 'fastify'

import productsRoutes from './routes/products.js'
import searchRoutes from './routes/search.js'
import usersRoutes from './routes/users.js'

export function buildApp(): FastifyInstance {

    const fastify = Fastify({
        logger: true
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
                message: 'Routes and parameters example',
                endpoints: [
                    'GET /api/users/:username',
                    'GET /api/search?query=...',
                    'GET /api/products/:productId?includeStock=true'
                ]
            }

        }
    )

    // The /api prefix is applied to every route defined inside these plugins.
    fastify.register(usersRoutes, { prefix: '/api' })
    fastify.register(searchRoutes, { prefix: '/api' })
    fastify.register(productsRoutes, { prefix: '/api' })

    return fastify

}
