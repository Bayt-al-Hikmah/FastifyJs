import type { FastifyPluginAsync } from 'fastify'

const encapsulatedRoutes: FastifyPluginAsync = async (fastify) => {

    // This hook belongs to the encapsulated plugin scope only.
    fastify.addHook('preHandler', async (request) => {

        request.lifecycle.push('encapsulated:preHandler')
        request.log.info('encapsulated:preHandler')

    })

    fastify.get(
        '/encapsulated',
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
                message: 'Route inside the encapsulated plugin',
                lifecycle: [...request.lifecycle],
                hint: 'This route also runs the plugin-local encapsulated:preHandler hook.'
            }

        }
    )

    fastify.get(
        '/encapsulated/error',
        {
            schema: {
                response: {
                    500: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        },
                        required: ['error'],
                        additionalProperties: false
                    }
                }
            }
        },
        async () => {

            throw new Error('Intentional error for the onError hook')

        }
    )

}

export default encapsulatedRoutes
