import fp from 'fastify-plugin'

import { ContactStore } from '../lib/contact-store.js'

import type { FastifyPluginAsync } from 'fastify'


declare module 'fastify' {

    interface FastifyInstance {

        contactStore: ContactStore

    }

}


const contactStorePlugin: FastifyPluginAsync = async (fastify) => {

    fastify.decorate('contactStore', new ContactStore())

}


export default fp(contactStorePlugin)
