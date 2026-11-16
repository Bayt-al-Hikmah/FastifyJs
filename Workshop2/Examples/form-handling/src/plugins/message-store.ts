import fp from 'fastify-plugin'

import { MessageStore } from '../lib/message-store.js'

import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        messageStore: MessageStore
    }
}

const messageStorePlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate('messageStore', new MessageStore())
}

export default fp(messageStorePlugin)
