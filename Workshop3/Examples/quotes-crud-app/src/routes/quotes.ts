import { Prisma } from '../generated/prisma/client.js'

import type { FastifyPluginAsync, FastifyReply } from 'fastify'

type QuoteBody = {
    author: string
    text: string
    _csrf: string
}

type QuoteParams = {
    id: string
}

type HomeQuery = {
    author?: string
    sort?: string
    deleted?: string
}

type DetailQuery = {
    created?: string
    updated?: string
}

const quoteSchema = {
    type: 'object',
    required: ['author', 'text', '_csrf'],
    properties: {
        author: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '\\S'
        },
        text: {
            type: 'string',
            minLength: 1,
            maxLength: 300,
            pattern: '\\S'
        },
        _csrf: {
            type: 'string',
            minLength: 1
        }
    },
    additionalProperties: false
} as const

function parseQuoteId(value: string): number | null {
    const id = Number(value)

    if (!Number.isInteger(id) || id < 1) {
        return null
    }

    return id
}

function isMissingRecord(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
    )
}

async function renderNotFound(reply: FastifyReply) {
    return reply.code(404).viewAsync('404', {
        title: 'Quote not found'
    })
}

const quoteRoutes: FastifyPluginAsync = async (fastify) => {
    // Read: list quotes with optional filtering and sorting.
    fastify.get<{ Querystring: HomeQuery }>(
        '/',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        author: {
                            type: 'string',
                            maxLength: 50
                        },
                        sort: {
                            type: 'string',
                            enum: ['newest', 'oldest', 'author']
                        },
                        deleted: {
                            type: 'string',
                            enum: ['1']
                        }
                    },
                    additionalProperties: false
                }
            }
        },
        async (request, reply) => {
            const author = request.query.author?.trim() ?? ''
            const sort = request.query.sort ?? 'newest'

            const where: Prisma.QuoteWhereInput = {}

            if (author.length > 0) {
                where.author = {
                    contains: author,
                    mode: 'insensitive'
                }
            }

            const primaryOrder: Prisma.QuoteOrderByWithRelationInput =
                sort === 'oldest'
                    ? { createdAt: 'asc' }
                    : sort === 'author'
                      ? { author: 'asc' }
                      : { createdAt: 'desc' }

            const quotes = await fastify.prisma.quote.findMany({
                where,
                orderBy: [primaryOrder, { id: 'desc' }]
            })

            return reply.viewAsync('index', {
                title: author ? `Quotes by ${author}` : 'Quote Library',
                quotes,
                author,
                sort,
                filtered: author.length > 0,
                quoteCount: quotes.length,
                deleted: request.query.deleted === '1'
            })
        }
    )

    // Create: display an empty quote form.
    fastify.get('/quotes/new', async (request, reply) => {
        const csrfToken = await reply.generateCsrf()

        return reply.viewAsync('quote-form', {
            title: 'New Quote',
            heading: 'Add a quote',
            subheading: 'Create a new record in the Quote table.',
            formAction: '/quotes',
            submitLabel: 'Create quote',
            values: {
                author: '',
                text: ''
            },
            csrfToken
        })
    })

    // Create: validate and persist a new quote.
    fastify.post<{ Body: QuoteBody }>(
        '/quotes',
        {
            schema: {
                body: {
                    content: {
                        'application/x-www-form-urlencoded': {
                            schema: quoteSchema
                        }
                    }
                }
            },
            attachValidation: true,
            preValidation: async (request) => {
                const body = request.body as Record<string, unknown>

                if (typeof body.author === 'string') {
                    body.author = body.author.trim()
                }

                if (typeof body.text === 'string') {
                    body.text = body.text.trim()
                }
            },
            preHandler: fastify.csrfProtection
        },
        async (request, reply) => {
            if (request.validationError) {
                const csrfToken = await reply.generateCsrf()
                const body = request.body as Partial<QuoteBody>

                return reply.code(400).viewAsync('quote-form', {
                    title: 'New Quote',
                    heading: 'Add a quote',
                    subheading: 'Create a new record in the Quote table.',
                    formAction: '/quotes',
                    submitLabel: 'Create quote',
                    error: 'Please check the author and quote text.',
                    values: {
                        author: body.author ?? '',
                        text: body.text ?? ''
                    },
                    csrfToken
                })
            }

            const { author, text } = request.body

            const quote = await fastify.prisma.quote.create({
                data: {
                    author,
                    text
                }
            })

            return reply.redirect(`/quotes/${quote.id}?created=1`, 303)
        }
    )

    // Read: display one quote and its management actions.
    fastify.get<{ Params: QuoteParams; Querystring: DetailQuery }>(
        '/quotes/:id',
        async (request, reply) => {
            const id = parseQuoteId(request.params.id)

            if (id === null) {
                return renderNotFound(reply)
            }

            const quote = await fastify.prisma.quote.findUnique({
                where: {
                    id
                }
            })

            if (!quote) {
                return renderNotFound(reply)
            }

            const csrfToken = await reply.generateCsrf()

            return reply.viewAsync('quote-detail', {
                title: quote.author,
                quote,
                csrfToken,
                created: request.query.created === '1',
                updated: request.query.updated === '1'
            })
        }
    )

    // Update: display the edit form with current values.
    fastify.get<{ Params: QuoteParams }>(
        '/quotes/:id/edit',
        async (request, reply) => {
            const id = parseQuoteId(request.params.id)

            if (id === null) {
                return renderNotFound(reply)
            }

            const quote = await fastify.prisma.quote.findUnique({
                where: {
                    id
                }
            })

            if (!quote) {
                return renderNotFound(reply)
            }

            const csrfToken = await reply.generateCsrf()

            return reply.viewAsync('quote-form', {
                title: `Edit quote ${quote.id}`,
                heading: 'Edit quote',
                subheading: `Update record #${quote.id}. Changes are written through Prisma.`,
                formAction: `/quotes/${quote.id}/edit`,
                submitLabel: 'Save changes',
                quoteId: quote.id,
                values: {
                    author: quote.author,
                    text: quote.text
                },
                csrfToken
            })
        }
    )

    // Update: validate and apply changes.
    fastify.post<{ Params: QuoteParams; Body: QuoteBody }>(
        '/quotes/:id/edit',
        {
            schema: {
                body: {
                    content: {
                        'application/x-www-form-urlencoded': {
                            schema: quoteSchema
                        }
                    }
                }
            },
            attachValidation: true,
            preValidation: async (request) => {
                const body = request.body as Record<string, unknown>

                if (typeof body.author === 'string') {
                    body.author = body.author.trim()
                }

                if (typeof body.text === 'string') {
                    body.text = body.text.trim()
                }
            },
            preHandler: fastify.csrfProtection
        },
        async (request, reply) => {
            const id = parseQuoteId(request.params.id)

            if (id === null) {
                return renderNotFound(reply)
            }

            if (request.validationError) {
                const csrfToken = await reply.generateCsrf()
                const body = request.body as Partial<QuoteBody>

                return reply.code(400).viewAsync('quote-form', {
                    title: `Edit quote ${id}`,
                    heading: 'Edit quote',
                    subheading: `Update record #${id}. Changes are written through Prisma.`,
                    formAction: `/quotes/${id}/edit`,
                    submitLabel: 'Save changes',
                    quoteId: id,
                    error: 'Please check the author and quote text.',
                    values: {
                        author: body.author ?? '',
                        text: body.text ?? ''
                    },
                    csrfToken
                })
            }

            const { author, text } = request.body

            try {
                await fastify.prisma.quote.update({
                    where: {
                        id
                    },
                    data: {
                        author,
                        text
                    }
                })
            } catch (error) {
                if (isMissingRecord(error)) {
                    return renderNotFound(reply)
                }

                throw error
            }

            return reply.redirect(`/quotes/${id}?updated=1`, 303)
        }
    )

    // Delete: remove a quote after CSRF verification.
    fastify.post<{ Params: QuoteParams }>(
        '/quotes/:id/delete',
        {
            preHandler: fastify.csrfProtection
        },
        async (request, reply) => {
            const id = parseQuoteId(request.params.id)

            if (id === null) {
                return renderNotFound(reply)
            }

            try {
                await fastify.prisma.quote.delete({
                    where: {
                        id
                    }
                })
            } catch (error) {
                if (isMissingRecord(error)) {
                    return renderNotFound(reply)
                }

                throw error
            }

            return reply.redirect('/?deleted=1', 303)
        }
    )
}

export default quoteRoutes
