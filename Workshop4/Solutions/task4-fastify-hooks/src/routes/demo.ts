import type { FastifyPluginAsync } from 'fastify'


type CreateUserBody = {
    username: string
}


const createUserSchema = {

    type: 'object',

    required: ['username'],

    properties: {

        username: {
            type: 'string',
            minLength: 2,
            maxLength: 30,
            pattern: '\\S'
        }

    },

    additionalProperties: false

} as const


const demoRoutes: FastifyPluginAsync = async (fastify) => {

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

                message: 'Fastify lifecycle hooks demonstration',

                endpoints: [
                    'GET /api/demo',
                    'POST /api/users',
                    'GET /api/error',
                    'GET /api/encapsulation/normal',
                    'GET /api/encapsulation/compare'
                ]

            }

        }
    )


    fastify.get(
        '/demo',

        {

            schema: {

                response: {

                    200: {

                        type: 'object',

                        properties: {

                            message: { type: 'string' },

                            hookOrder: {
                                type: 'array',
                                items: { type: 'string' }
                            }

                        },

                        required: ['message', 'hookOrder'],

                        additionalProperties: false

                    }

                }

            }

        },

        async () => {

            return {

                message:
                    'Check the terminal and the X-Hook-Order response header.',

                hookOrder: [
                    'onRequest',
                    'preValidation',
                    'preHandler',
                    'onSend',
                    'onResponse'
                ]

            }

        }
    )


    fastify.post<{ Body: CreateUserBody }>(
        '/users',

        {

            schema: {

                body: createUserSchema,

                response: {

                    201: {

                        type: 'object',

                        properties: {

                            message: { type: 'string' },

                            username: { type: 'string' }

                        },

                        required: ['message', 'username'],

                        additionalProperties: false

                    }

                }

            }

        },

        async (request, reply) => {

            // The preValidation hook has already trimmed the username.
            // Because normalization happens before validation, a value
            // such as "  Alice  " passes the minLength and pattern rules.

            return reply.code(201).send({

                message: 'Username normalized by the preValidation hook',

                username: request.body.username

            })

        }
    )


    fastify.get(
        '/error',

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

            throw new Error('Intentional error for the hook demonstration')

        }
    )


    fastify.get(
        '/encapsulation/compare',

        {

            schema: {

                response: {

                    200: {

                        type: 'object',

                        properties: {

                            normalPluginDecoratorVisible: { type: 'boolean' },

                            sharedPluginDecoratorVisible: { type: 'boolean' },

                            sharedValue: { type: 'string' }

                        },

                        required: [
                            'normalPluginDecoratorVisible',
                            'sharedPluginDecoratorVisible',
                            'sharedValue'
                        ],

                        additionalProperties: false

                    }

                }

            }

        },

        async () => {

            return {

                normalPluginDecoratorVisible:
                    fastify.hasDecorator('normalScopeValue'),

                sharedPluginDecoratorVisible:
                    fastify.hasDecorator('sharedScopeValue'),

                sharedValue: fastify.sharedScopeValue

            }

        }
    )

}


export default demoRoutes
