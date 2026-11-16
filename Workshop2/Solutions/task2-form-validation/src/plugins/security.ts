import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import csrfProtection from '@fastify/csrf-protection'

import type { FastifyPluginAsync } from 'fastify'


const securityPlugin: FastifyPluginAsync = async (fastify) => {

    // Cookie support must be registered before the CSRF plugin uses it.
    fastify.register(cookie)

    // The CSRF plugin stores a secret in a cookie and validates the token
    // submitted with each protected form.
    fastify.register(csrfProtection)

}


export default fp(securityPlugin)
