import type { FastifyPluginAsync } from 'fastify'

type SearchQuery = {
    author?: string
}

const searchQuerySchema = {
    type: 'object',

    properties: {
        author: {
            type: 'string',
            maxLength: 50
        }
    },

    additionalProperties: false
}

function suggestedAuthors(authors: string[]): Array<{ name: string; url: string }> {
    return authors.slice(0, 6).map((author) => ({
        name: author,
        url: `/search?author=${encodeURIComponent(author)}`
    }))
}

const searchRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: SearchQuery }>(
        '/search',
        {
            schema: {
                querystring: searchQuerySchema
            },

            attachValidation: true
        },

        async (request, reply) => {
            const rawAuthor = typeof request.query.author === 'string' ? request.query.author : ''
            const authorQuery = rawAuthor.trim()
            const searched = authorQuery.length > 0 && !request.validationError

            const results = searched
                ? fastify.quoteStore
                      .findByAuthor(authorQuery)
                      .map((quote) => fastify.quoteStore.toView(quote))
                : []

            return reply.viewAsync('search', {
                title: 'Search Quotes',
                description: 'Find quotes by their original author using an exact, case-insensitive name.',
                authorQuery,
                searched,
                results,
                resultCount: results.length,
                queryError: request.validationError
                    ? 'Author names used for search must be 50 characters or fewer.'
                    : undefined,
                suggestions: suggestedAuthors(fastify.quoteStore.getDistinctAuthors()),
                isSearch: true
            })
        }
    )
}

export default searchRoutes
