import cookie from '@fastify/cookie'
import csrf from '@fastify/csrf-protection'
import fp from 'fastify-plugin'

import type { FastifyPluginAsync } from 'fastify'

const securityPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(cookie, {
        secret: process.env.COOKIE_SECRET ?? 'workshop3-development-cookie-secret'
    })

    await fastify.register(csrf)
}

export default fp(securityPlugin, {
    name: 'security'
})
