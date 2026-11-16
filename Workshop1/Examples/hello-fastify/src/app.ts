import Fastify, { type FastifyInstance } from 'fastify'

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
                            service: { type: 'string' },
                            documentation: { type: 'string' }
                        },
                        required: ['message', 'service', 'documentation'],
                        additionalProperties: false
                    }
                }
            }
        },
        async () => {

            return {
                message: 'Hello, World!',
                service: 'hello-fastify',
                documentation: 'Try GET /health for a status check.'
            }

        }
    )

    fastify.get(
        '/health',
        {
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            uptime: { type: 'number' }
                        },
                        required: ['status', 'uptime'],
                        additionalProperties: false
                    }
                }
            }
        },
        async () => {

            return {
                status: 'ok',
                uptime: Math.round(process.uptime())
            }

        }
    )

    return fastify

}
