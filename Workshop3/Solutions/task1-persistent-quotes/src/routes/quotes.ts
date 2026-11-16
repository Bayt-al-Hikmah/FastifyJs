import type { FastifyPluginAsync } from 'fastify'

type QuoteBody = {
    author: string
    text: string
    _csrf: string
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

const quoteRoutes: FastifyPluginAsync = async (fastify) => {
    // Homepage: the ten most recently submitted quotes.
    fastify.get('/', async (request, reply) => {
        const quotes = await fastify.prisma.quote.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        })

        return reply.viewAsync('index', {
            title: 'Recent Quotes',
            quotes
        })
    })

    // Display the quote submission form.
    fastify.get<{ Querystring: { created?: string } }>(
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
    fastify.get<{ Querystring: { author?: string } }>(
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
}

export default quoteRoutes
