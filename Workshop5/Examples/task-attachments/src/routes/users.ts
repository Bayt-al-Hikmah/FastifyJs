import type { FastifyPluginAsync } from 'fastify'


const currentUserSchema = {

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

} as const


const userRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get(
        '/me',

        {

            preHandler: [
                fastify.authenticate
            ],

            schema: {

                response: {

                    200: currentUserSchema

                }

            }

        },

        async (request) => {

            return request.currentUser

        }
    )

}


export default userRoutes
