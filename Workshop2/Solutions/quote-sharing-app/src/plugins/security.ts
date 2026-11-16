import fp from 'fastify-plugin'

import cookie from '@fastify/cookie'
import csrfProtection from '@fastify/csrf-protection'

import type { FastifyPluginAsync } from 'fastify'

const securityPlugin: FastifyPluginAsync = async (fastify) => {
    // The CSRF plugin stores its secret in a cookie, so cookie support comes first.
    fastify.register(cookie)

    fastify.register(csrfProtection)
}

export default fp(securityPlugin)
