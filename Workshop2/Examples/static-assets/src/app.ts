import Fastify, { type FastifyInstance } from 'fastify'

import homeRoutes from './routes/home.js'
import staticPlugin from './plugins/static.js'
import viewsPlugin from './plugins/views.js'

export function buildApp(): FastifyInstance {
    const fastify = Fastify({
        logger: true
    })

    fastify.register(viewsPlugin)
    fastify.register(staticPlugin)
    fastify.register(homeRoutes)

    fastify.setNotFoundHandler(async (_request, reply) => {
        return reply.code(404).viewAsync('not-found', {
            title: 'Page not found',
            description: 'The requested page does not exist.',
            isHome: false
        })
    })

    return fastify
}
