import type { FastifyPluginAsync } from 'fastify'


const protectedRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get(
        '/profile',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                response: {

                    200: {

                        type: 'object',

                        properties: {

                            message: { type: 'string' },

                            user: {

                                type: 'object',

                                properties: {

                                    id: { type: 'integer' },

                                    name: { type: 'string' },

                                    email: { type: 'string' },

                                    role: {
                                        type: 'string',
                                        enum: ['USER', 'ADMIN']
                                    }

                                },

                                required: [
                                    'id',
                                    'name',
                                    'email',
                                    'role'
                                ],

                                additionalProperties: false

                            }

                        },

                        required: ['message', 'user'],

                        additionalProperties: false

                    }

                }

            }

        },

        async (request) => {

            const user = request.currentUser!

            return {

                message: `Hello, ${user.name}. This route requires a valid access token.`,

                user

            }

        }
    )

}


export default protectedRoutes
