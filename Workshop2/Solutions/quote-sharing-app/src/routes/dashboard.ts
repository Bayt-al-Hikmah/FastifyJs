import type { FastifyPluginAsync } from 'fastify'

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/dashboard', async (_request, reply) => {
        const stats = fastify.quoteStore.getStats()
        const leaderboard = fastify.quoteStore.getAuthorLeaderboard(5).map((entry) => ({
            ...entry,
            countLabel: entry.count === 1 ? 'quote' : 'quotes'
        }))
        const latestQuotes = fastify.quoteStore
            .getNewest(3)
            .map((quote) => fastify.quoteStore.toView(quote))

        return reply.viewAsync('dashboard', {
            title: 'Dashboard',
            description: 'A live snapshot of the in-memory quote collection.',
            stats,
            leaderboard,
            latestQuotes,
            hasQuotes: stats.totalQuotes > 0,
            isDashboard: true
        })
    })
}

export default dashboardRoutes
