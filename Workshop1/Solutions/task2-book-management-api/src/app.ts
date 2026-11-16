import Fastify, { type FastifyInstance } from 'fastify'

import booksRoutes from './routes/books.js'

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
                message: 'Book management API',
                endpoints: [
                    'GET /api/books/:bookId',
                    'GET /api/books/:bookId?summary=true',
                    'POST /api/books'
                ]
            }

        }
    )

    fastify.register(booksRoutes, { prefix: '/api' })

    return fastify

}
