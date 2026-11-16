import type { FastifyPluginAsync } from 'fastify'

type Book = {
    id: string
    title: string
    author: string
    price: number
}

type CreateBookBody = {
    title: string
    author: string
    price: number
}

// Hardcoded books simulate a database. New books are kept in memory.
const books: Record<string, Book> = {

    '201': {
        id: '201',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        price: 35
    },

    '202': {
        id: '202',
        title: 'The Mythical Man-Month',
        author: 'Frederick P. Brooks Jr.',
        price: 30
    }

}

let nextBookId = 203

const booksRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{
        Params: {
            bookId: string
        }
        Querystring: {
            summary?: 'true' | 'false'
        }
    }>(
        '/books/:bookId',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        bookId: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 20
                        }
                    },
                    required: ['bookId'],
                    additionalProperties: false
                },
                querystring: {
                    type: 'object',
                    properties: {
                        summary: {
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
                            id: { type: 'string' },
                            title: { type: 'string' },
                            author: { type: 'string' },
                            price: { type: 'number' }
                        },
                        required: ['title', 'author'],
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

            const bookId = request.params.bookId
            const book = books[bookId]

            if (!book) {

                return reply.code(404).send({
                    error: 'Book not found'
                })

            }

            // Only the title and author are needed when summary mode is active.
            const summaryOnly = request.query.summary === 'true'

            if (summaryOnly) {

                return {
                    title: book.title,
                    author: book.author
                }

            }

            return {
                id: book.id,
                title: book.title,
                author: book.author,
                price: book.price
            }

        }
    )

    fastify.post<{
        Body: CreateBookBody
    }>(
        '/books',
        {
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 200
                        },
                        author: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 200
                        },
                        price: {
                            type: 'number',
                            exclusiveMinimum: 0
                        }
                    },
                    required: ['title', 'author', 'price'],
                    additionalProperties: false
                },
                response: {
                    201: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            author: { type: 'string' },
                            price: { type: 'number' }
                        },
                        required: ['id', 'title', 'author', 'price'],
                        additionalProperties: false
                    }
                }
            }
        },
        async (request, reply) => {

            const { title, author, price } = request.body

            const book: Book = {
                id: String(nextBookId),
                title,
                author,
                price
            }

            books[book.id] = book
            nextBookId += 1

            return reply.code(201).send(book)

        }
    )

}

export default booksRoutes
