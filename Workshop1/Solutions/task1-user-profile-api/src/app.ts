import Fastify, { type FastifyInstance } from 'fastify'

import profileRoutes from './routes/profile.js'

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
                message: 'User profile API',
                endpoints: [
                    'GET /api/profile/:username',
                    'GET /api/profile/:username?details=true'
                ]
            }

        }
    )

    fastify.register(profileRoutes, { prefix: '/api' })

    return fastify

}
