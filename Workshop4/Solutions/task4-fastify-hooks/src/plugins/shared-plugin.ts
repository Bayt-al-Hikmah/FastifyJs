import fp from 'fastify-plugin'

import type { FastifyPluginAsync } from 'fastify'


const sharedPlugin: FastifyPluginAsync = async (fastify) => {

    fastify.decorate(
        'sharedScopeValue',
        'visible in the parent scope because of fastify-plugin'
    )

}


// fastify-plugin deliberately skips the new encapsulation context.
// The decorator is added to the parent instance instead.

export default fp(sharedPlugin, {

    name: 'shared-scope'

})
