import type { FastifyPluginAsync } from 'fastify'

const searchRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{
        Querystring: {
            query?: string
        }
    }>(
        '/search',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100
                        }
                    },
                    additionalProperties: false
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' }
                        },
                        required: ['message'],
                        additionalProperties: false
                    }
                }
            }
        },
        async (request) => {

            const searchTerm = request.query.query

            if (searchTerm) {

                return {
                    message: `You are searching for: ${searchTerm}`
                }

            }

            return {
                message: 'Please provide a search query.'
            }

        }
    )

}

export default searchRoutes
