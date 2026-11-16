import type { FastifyPluginAsync } from 'fastify'

const demoRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get(
        '/demo',
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
                message: 'Route registered directly under /api',
                lifecycle: [...request.lifecycle],
                hint: 'Compare the X-Lifecycle header with GET /api/encapsulated.'
            }

        }
    )

    fastify.get(
        '/demo/ping',
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
                            }
                        },
                        required: ['message', 'lifecycle'],
                        additionalProperties: false
                    }
                }
            }
        },
        async (request) => {

            return {
                message: 'pong',
                lifecycle: [...request.lifecycle]
            }

        }
    )

}

export default demoRoutes
