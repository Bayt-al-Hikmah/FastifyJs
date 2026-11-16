import Fastify, { type FastifyInstance } from 'fastify'

import lifecyclePlugin from './plugins/lifecycle.js'
import normalPlugin from './plugins/normal-plugin.js'
import sharedPlugin from './plugins/shared-plugin.js'

import demoRoutes from './routes/demo.js'


export function buildApp(): FastifyInstance {

    const fastify = Fastify({

        logger: true

    })


    // Register hooks first so they apply to every route below.

    fastify.register(lifecyclePlugin)


    // A normal plugin creates an encapsulated scope.

    fastify.register(normalPlugin, {

        prefix: '/api/encapsulation'

    })


    // fastify-plugin exposes the decorator to the parent scope.

    fastify.register(sharedPlugin)


    fastify.register(demoRoutes, {

        prefix: '/api'

    })


    fastify.setErrorHandler((error, request, reply) => {

        if (error.validation) {

            return reply.code(400).send({
                error: 'Request validation failed'
            })

        }

        if (
            error.statusCode &&
            error.statusCode >= 400 &&
            error.statusCode < 500
        ) {

            return reply.code(error.statusCode).send({
                error: error.message
            })

        }

        // onError has already logged the details. Never expose an
        // internal stack trace to the client.

        return reply.code(500).send({
            error: 'Internal server error'
        })

    })


    fastify.setNotFoundHandler(async (request, reply) => {

        return reply.code(404).send({
            error: 'Route not found'
        })

    })


    return fastify

}
