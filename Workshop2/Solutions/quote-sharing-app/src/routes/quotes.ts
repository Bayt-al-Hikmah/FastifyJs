import type { FastifyPluginAsync } from 'fastify'

type QuoteBody = {
    author: string
    quote: string
    _csrf: string
}

type QuoteErrors = {
    author?: string
    quote?: string
}

type SchemaIssue = {
    instancePath?: string
    keyword?: string
}

const quoteBodySchema = {
    type: 'object',

    required: ['author', 'quote', '_csrf'],

    properties: {
        author: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '\\S'
        },

        quote: {
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
}

function readValues(body: unknown): { author: string; quote: string } {
    if (body === null || typeof body !== 'object') {
        return { author: '', quote: '' }
    }

    const record = body as Record<string, unknown>

    return {
        author: typeof record.author === 'string' ? record.author : '',
        quote: typeof record.quote === 'string' ? record.quote : ''
    }
}

function mapValidationErrors(validation: unknown): QuoteErrors {
    const errors: QuoteErrors = {}

    if (!Array.isArray(validation)) {
        return errors
    }

    for (const issue of validation as SchemaIssue[]) {
        if (issue.instancePath === '/author') {
            errors.author = 'Author name must be between 3 and 50 characters and cannot be only spaces.'
        }

        if (issue.instancePath === '/quote') {
            errors.quote = 'Quote must be between 1 and 300 characters and cannot be only spaces.'
        }
    }

    return errors
}

const quoteRoutes: FastifyPluginAsync = async (fastify) => {
    // Display the quote submission form with a fresh CSRF token.
    fastify.get<{ Querystring: { submitted?: string } }>('/share', async (request, reply) => {
        const csrfToken = await reply.generateCsrf()

        return reply.viewAsync('share', {
            title: 'Share a Quote',
            description: 'Add a quote and its original author to the collection.',
            csrfToken,
            submitted: request.query.submitted === '1',
            values: {
                author: '',
                quote: ''
            },
            errors: {},
            isShare: true
        })
    })

    // Validate, verify the CSRF token, store the quote, then redirect.
    fastify.post<{ Body: QuoteBody }>(
        '/share',
        {
            schema: {
                body: {
                    content: {
                        'application/x-www-form-urlencoded': {
                            schema: quoteBodySchema
                        },

                        'application/json': {
                            schema: quoteBodySchema
                        }
                    }
                }
            },

            // Render our own form instead of Fastify's JSON validation response.
            attachValidation: true,

            // Normalize values before the schema checks their length.
            preValidation: async (request) => {
                if (request.body === null || typeof request.body !== 'object') {
                    return
                }

                const body = request.body as Record<string, unknown>

                if (typeof body.author === 'string') {
                    body.author = body.author.trim()
                }

                if (typeof body.quote === 'string') {
                    body.quote = body.quote.trim()
                }
            },

            // The token is in the body, so CSRF verification runs after parsing.
            preHandler: fastify.csrfProtection
        },

        async (request, reply) => {
            const values = readValues(request.body)

            if (request.validationError) {
                const errors = mapValidationErrors(request.validationError.validation)
                const csrfToken = await reply.generateCsrf()

                return reply.code(400).viewAsync('share', {
                    title: 'Share a Quote',
                    description: 'Add a quote and its original author to the collection.',
                    csrfToken,
                    submitted: false,
                    values,
                    errors,
                    formError: 'Please check the highlighted fields and try again.',
                    isShare: true
                })
            }

            const { author, quote } = request.body

            fastify.quoteStore.add(author, quote)

            fastify.log.info({ author }, 'Quote submitted')

            return reply.redirect('/share?submitted=1', 303)
        }
    )
}

export default quoteRoutes
