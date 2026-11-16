import fp from 'fastify-plugin'

import { QuoteStore } from '../lib/quote-store.js'

import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        quoteStore: QuoteStore
    }
}

const quoteStorePlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate('quoteStore', new QuoteStore())
}

export default fp(quoteStorePlugin)
