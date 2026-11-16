import type { FastifyPluginAsync } from 'fastify'

const homeRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async (_request, reply) => {
        const quotes = fastify.quoteStore.getNewest(10).map((quote) => fastify.quoteStore.toView(quote))
        const stats = fastify.quoteStore.getStats()

        return reply.viewAsync('index', {
            title: 'Quote Sharing',
            description: 'A quiet collection of quotes, shared by visitors and kept in memory.',
            quotes,
            stats,
            hasMore: stats.totalQuotes > quotes.length,
            isHome: true
        })
    })
}

export default homeRoutes
