import type { FastifyPluginAsync } from 'fastify'

type UserProfile = {
    username: string
    email: string
    role: string
}

// Hardcoded data keeps the exercise focused on routes, query strings, and schemas.
const users: Record<string, UserProfile> = {

    Alice: {
        username: 'Alice',
        email: 'alice@example.com',
        role: 'admin'
    },

    Bob: {
        username: 'Bob',
        email: 'bob@example.com',
        role: 'member'
    }

}

const profileRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{
        Params: {
            username: string
        }
        Querystring: {
            details?: 'true' | 'false'
        }
    }>(
        '/profile/:username',
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
                querystring: {
                    type: 'object',
                    properties: {
                        details: {
                            type: 'string',
                            enum: ['true', 'false']
                        }
                    },
                    additionalProperties: false
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            username: { type: 'string' },
                            email: { type: 'string' },
                            role: { type: 'string' }
                        },
                        required: ['username'],
                        additionalProperties: false
                    },
                    404: {
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
        async (request, reply) => {

            const username = request.params.username
            const profile = users[username]

            if (!profile) {

                return reply.code(404).send({
                    error: 'User not found'
                })

            }

            // Query values are strings, so compare against the string 'true'.
            const includeDetails = request.query.details === 'true'

            if (!includeDetails) {

                return {
                    username: profile.username
                }

            }

            return {
                username: profile.username,
                email: profile.email,
                role: profile.role
            }

        }
    )

}

export default profileRoutes
