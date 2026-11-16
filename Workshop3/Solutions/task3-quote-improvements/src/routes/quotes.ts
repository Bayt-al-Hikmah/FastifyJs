import { Prisma } from '../generated/prisma/client.js'

import { QUOTE_CATEGORIES } from '../lib/categories.js'

import type { FastifyPluginAsync, FastifyReply } from 'fastify'

type QuoteBody = {
    author: string
    text: string
    category?: string
    _csrf: string
}

type QuoteParams = {
    id: string
}

type HomeQuery = {
    page?: string
    author?: string
    from?: string
    to?: string
    sort?: string
    category?: string
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

type SortKey = 'newest' | 'oldest' | 'author-asc' | 'author-desc'

type HomeFilters = {
    author: string
    from: string
    to: string
    sort: SortKey
    category: string
}

const PAGE_SIZE = 9

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
        category: {
            type: 'string',
            maxLength: 50
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

function parsePage(value: string | undefined): number {
    const page = Number(value ?? '1')

    if (!Number.isInteger(page) || page < 1) {
        return 1
    }

    return page
}

function normaliseSort(value: string | undefined): SortKey {
    switch (value) {
        case 'oldest':
            return 'oldest'
        case 'author-asc':
            return 'author-asc'
        case 'author-desc':
            return 'author-desc'
        default:
            return 'newest'
    }
}

function parseStartDate(value: string | undefined): Date | undefined {
    if (!value) {
        return undefined
    }

    const date = new Date(`${value}T00:00:00.000Z`)

    return Number.isNaN(date.getTime()) ? undefined : date
}

function parseEndDate(value: string | undefined): Date | undefined {
    if (!value) {
        return undefined
    }

    const date = new Date(`${value}T23:59:59.999Z`)

    return Number.isNaN(date.getTime()) ? undefined : date
}

function readFilters(query: HomeQuery): HomeFilters {
    return {
        author: query.author?.trim() ?? '',
        from: query.from?.trim() ?? '',
        to: query.to?.trim() ?? '',
        sort: normaliseSort(query.sort),
        category: query.category?.trim() ?? ''
    }
}

function hasActiveFilters(filters: HomeFilters): boolean {
    return (
        filters.author.length > 0 ||
        filters.from.length > 0 ||
        filters.to.length > 0 ||
        filters.category.length > 0 ||
        filters.sort !== 'newest'
    )
}

function buildHomeUrl(filters: HomeFilters, page: number): string {
    const params = new URLSearchParams()

    if (filters.author.length > 0) {
        params.set('author', filters.author)
    }

    if (filters.from.length > 0) {
        params.set('from', filters.from)
    }

    if (filters.to.length > 0) {
        params.set('to', filters.to)
    }

    if (filters.sort !== 'newest') {
        params.set('sort', filters.sort)
    }

    if (filters.category.length > 0) {
        params.set('category', filters.category)
    }

    params.set('page', String(page))

    return `/?${params.toString()}`
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
    // Homepage: paginated, filtered, and sortable quote collection.
    fastify.get<{ Querystring: HomeQuery }>(
        '/',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'string',
                            maxLength: 5
                        },
                        author: {
                            type: 'string',
                            maxLength: 50
                        },
                        from: {
                            type: 'string',
                            maxLength: 10
                        },
                        to: {
                            type: 'string',
                            maxLength: 10
                        },
                        sort: {
                            type: 'string',
                            enum: ['newest', 'oldest', 'author-asc', 'author-desc']
                        },
                        category: {
                            type: 'string',
                            maxLength: 50
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
            const filters = readFilters(request.query)
            const requestedPage = parsePage(request.query.page)

            const where: Prisma.QuoteWhereInput = {}

            if (filters.author.length > 0) {
                where.author = {
                    contains: filters.author,
                    mode: 'insensitive'
                }
            }

            if (filters.category.length > 0) {
                where.category = filters.category
            }

            const fromDate = parseStartDate(filters.from)
            const toDate = parseEndDate(filters.to)

            if (fromDate || toDate) {
                const createdAt: { gte?: Date; lte?: Date } = {}

                if (fromDate) {
                    createdAt.gte = fromDate
                }

                if (toDate) {
                    createdAt.lte = toDate
                }

                where.createdAt = createdAt
            }

            const orderBy: Prisma.QuoteOrderByWithRelationInput[] =
                filters.sort === 'oldest'
                    ? [{ createdAt: 'asc' }, { id: 'asc' }]
                    : filters.sort === 'author-asc'
                      ? [{ author: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }]
                      : filters.sort === 'author-desc'
                        ? [{ author: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
                        : [{ createdAt: 'desc' }, { id: 'desc' }]

            const totalQuotes = await fastify.prisma.quote.count({
                where
            })

            const totalPages = Math.max(1, Math.ceil(totalQuotes / PAGE_SIZE))
            const page = Math.min(requestedPage, totalPages)

            const quotes = await fastify.prisma.quote.findMany({
                where,
                orderBy,
                skip: (page - 1) * PAGE_SIZE,
                take: PAGE_SIZE
            })

            const windowStart = Math.max(1, page - 2)
            const windowEnd = Math.min(totalPages, windowStart + 4)
            const pages: Array<{ number: number; url: string; active: boolean }> = []

            for (let pageNumber = windowStart; pageNumber <= windowEnd; pageNumber += 1) {
                pages.push({
                    number: pageNumber,
                    url: buildHomeUrl(filters, pageNumber),
                    active: pageNumber === page
                })
            }

            const pagination = {
                page,
                totalPages,
                totalQuotes,
                pageSize: PAGE_SIZE,
                previousUrl: page > 1 ? buildHomeUrl(filters, page - 1) : null,
                nextUrl: page < totalPages ? buildHomeUrl(filters, page + 1) : null,
                pages,
                showFirst: windowStart > 1,
                firstUrl: buildHomeUrl(filters, 1),
                showLast: windowEnd < totalPages,
                lastUrl: buildHomeUrl(filters, totalPages)
            }

            return reply.viewAsync('index', {
                title: 'Quote Library',
                quotes,
                filters,
                categories: QUOTE_CATEGORIES,
                filtered: hasActiveFilters(filters),
                pagination,
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
                categories: QUOTE_CATEGORIES,
                submitted: request.query.created === '1',
                values: {
                    author: '',
                    text: '',
                    category: ''
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

                if (typeof body.category === 'string') {
                    body.category = body.category.trim()
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
                    categories: QUOTE_CATEGORIES,
                    error: 'Please check the author, quote text, and category.',
                    values: {
                        author: body.author ?? '',
                        text: body.text ?? '',
                        category: body.category ?? ''
                    }
                })
            }

            const { author, text } = request.body
            const category = request.body.category?.trim() ?? ''

            await fastify.prisma.quote.create({
                data: {
                    author,
                    text,
                    category: category.length > 0 ? category : null
                }
            })

            return reply.redirect('/share?created=1', 303)
        }
    )

    // Case-insensitive partial-author search.
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
                              contains: author,
                              mode: 'insensitive'
                          }
                      },
                      orderBy: {
                          createdAt: 'desc'
                      },
                      take: 50
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
        const [quoteStats, authorGroups, categoryGroups, latestQuote] = await Promise.all([
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
            fastify.prisma.quote.groupBy({
                by: ['category'],
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

        const topAuthors = [...authorGroups]
            .sort((left, right) => right._count._all - left._count._all)
            .slice(0, 5)
            .map((group) => ({
                name: group.author,
                count: group._count._all
            }))

        const topCategories = [...categoryGroups]
            .sort((left, right) => right._count._all - left._count._all)
            .slice(0, 6)
            .map((group) => ({
                name: group.category ?? 'Uncategorised',
                count: group._count._all
            }))

        return reply.viewAsync('dashboard', {
            title: 'Dashboard',
            totalQuotes: quoteStats._count._all,
            totalAuthors: authorGroups.length,
            totalCategories: categoryGroups.filter((group) => group.category !== null).length,
            newestSubmittedAt: quoteStats._max.createdAt,
            latestQuote,
            topAuthors,
            topCategories
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
                categories: QUOTE_CATEGORIES,
                updated: request.query.updated === '1',
                values: {
                    author: quote.author,
                    text: quote.text,
                    category: quote.category ?? ''
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

                if (typeof body.category === 'string') {
                    body.category = body.category.trim()
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
                    categories: QUOTE_CATEGORIES,
                    error: 'Please check the author, quote text, and category.',
                    values: {
                        author: body.author ?? '',
                        text: body.text ?? '',
                        category: body.category ?? ''
                    },
                    csrfToken
                })
            }

            const { author, text } = request.body
            const category = request.body.category?.trim() ?? ''

            try {
                await fastify.prisma.quote.update({
                    where: {
                        id
                    },
                    data: {
                        author,
                        text,
                        category: category.length > 0 ? category : null
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
