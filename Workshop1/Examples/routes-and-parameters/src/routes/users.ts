import type { FastifyPluginAsync } from 'fastify'

const usersRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{
        Params: {
            username: string
        }
    }>(
        '/users/:username',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        username: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 50
                        }
                    },
                    required: ['username'],
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

            const username = request.params.username

            return {
                message: `Hello, ${username}!`
            }

        }
    )

}

export default usersRoutes
