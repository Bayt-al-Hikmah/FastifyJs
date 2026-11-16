import Fastify, { type FastifyInstance } from 'fastify'

import homeRoutes from './routes/home.js'
import noteRoutes from './routes/notes.js'
import viewsPlugin from './plugins/views.js'
import staticPlugin from './plugins/static.js'

export function buildApp(): FastifyInstance {
    const fastify = Fastify({
        logger: true
    })

    fastify.register(viewsPlugin)
    fastify.register(staticPlugin)

    fastify.register(homeRoutes)
    fastify.register(noteRoutes)

    fastify.setNotFoundHandler(async (_request, reply) => {
        return reply.code(404).viewAsync('not-found', {
            title: 'Page not found',
            description: 'The requested page does not exist.',
            message: 'That page has wandered out of the notebook.',
            isHome: false
        })
    })

    return fastify
}
