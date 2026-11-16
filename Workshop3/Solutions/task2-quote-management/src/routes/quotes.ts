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
    deleted?: string
}

type SearchQuery = {
    author?: string
}

type ShareQuery = {
    created?: string
}

type EditQuery = {
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
    // Homepage: the ten most recently submitted quotes.
    fastify.get<{ Querystring: HomeQuery }>(
        '/',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
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
            const quotes = await fastify.prisma.quote.findMany({
                orderBy: {
                    createdAt: 'desc'
                },
                take: 10
            })

            return reply.viewAsync('index', {
                title: 'Recent Quotes',
                quotes,
                deleted: request.query.deleted === '1'
            })
        }
    )

    // Display the quote submission form.
    fastify.get<{ Querystring: ShareQuery }>(
        '/share',
        async (request, reply) => {
            const csrfToken = await reply.generateCsrf()

            return reply.viewAsync('share', {
                title: 'Share a Quote',
                csrfToken,
                submitted: request.query.created === '1',
                values: {
                    author: '',
                    text: ''
                }
            })
        }
    )

    // Store a submitted quote after validation and CSRF verification.
    fastify.post<{ Body: QuoteBody }>(
        '/share',
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

                return reply.code(400).viewAsync('share', {
                    title: 'Share a Quote',
                    csrfToken,
                    error: 'Please check the author and quote text.',
                    values: {
                        author: body.author ?? '',
                        text: body.text ?? ''
                    }
                })
            }

            const { author, text } = request.body

            await fastify.prisma.quote.create({
                data: {
                    author,
                    text
                }
            })

            return reply.redirect('/share?created=1', 303)
        }
    )

    // Case-insensitive exact-author search.
    fastify.get<{ Querystring: SearchQuery }>(
        '/search',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        author: {
                            type: 'string',
                            maxLength: 50
                        }
                    },
                    additionalProperties: false
                }
            }
        },
        async (request, reply) => {
            const author = request.query.author?.trim() ?? ''

            const quotes = author
                ? await fastify.prisma.quote.findMany({
                      where: {
                          author: {
                              equals: author,
                              mode: 'insensitive'
                          }
                      },
                      orderBy: {
                          createdAt: 'desc'
                      }
                  })
                : []

            return reply.viewAsync('search', {
                title: 'Search Quotes',
                author,
                quotes,
                quoteCount: quotes.length,
                searched: author.length > 0
            })
        }
    )

    // Dashboard statistics calculated by PostgreSQL through Prisma.
    fastify.get('/dashboard', async (request, reply) => {
        const [quoteStats, authorGroups, latestQuote] = await Promise.all([
            fastify.prisma.quote.aggregate({
                _count: {
                    _all: true
                },
                _max: {
                    createdAt: true
                }
            }),
            fastify.prisma.quote.groupBy({
                by: ['author'],
                _count: {
                    _all: true
                }
            }),
            fastify.prisma.quote.findFirst({
                orderBy: {
                    createdAt: 'desc'
                }
            })
        ])

        return reply.viewAsync('dashboard', {
            title: 'Dashboard',
            totalQuotes: quoteStats._count._all,
            totalAuthors: authorGroups.length,
            newestSubmittedAt: quoteStats._max.createdAt,
            latestQuote
        })
    })

    // Display the edit form with the current quote values.
    fastify.get<{ Params: QuoteParams; Querystring: EditQuery }>(
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

            return reply.viewAsync('edit-quote', {
                title: `Edit quote ${quote.id}`,
                quote,
                quoteId: quote.id,
                updated: request.query.updated === '1',
                values: {
                    author: quote.author,
                    text: quote.text
                },
                csrfToken
            })
        }
    )

    // Validate and apply changes to an existing quote.
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

                return reply.code(400).viewAsync('edit-quote', {
                    title: `Edit quote ${id}`,
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

            return reply.redirect(`/quotes/${id}/edit?updated=1`, 303)
        }
    )

    // Display a confirmation page before deleting a quote.
    fastify.get<{ Params: QuoteParams }>(
        '/quotes/:id/delete',
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

            return reply.viewAsync('confirm-delete', {
                title: `Delete quote ${quote.id}`,
                quote,
                csrfToken
            })
        }
    )

    // Delete a quote after explicit confirmation and CSRF verification.
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
