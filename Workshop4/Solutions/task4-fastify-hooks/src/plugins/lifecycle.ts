import fp from 'fastify-plugin'

import type { FastifyPluginAsync } from 'fastify'


const lifecyclePlugin: FastifyPluginAsync = async (fastify) => {

    fastify.decorateRequest('startedAt', 0)


    // Request hooks

    fastify.addHook('onRequest', async (request) => {

        request.startedAt = Date.now()

        request.log.info({

            method: request.method,

            url: request.url,

            route: request.routeOptions.url

        }, '[onRequest] Incoming request')

    })


    fastify.addHook('preValidation', async (request) => {

        const body = request.body as {
            username?: unknown
        } | undefined


        // preValidation runs before schema validation, so the body is
        // still untrusted. Check the type before calling .trim().

        if (
            body &&
            typeof body === 'object' &&
            typeof body.username === 'string'
        ) {

            body.username = body.username.trim()

            request.log.info({

                normalizedUsername: body.username

            }, '[preValidation] Normalized username')

        }

    })


    // Response hooks

    fastify.addHook('onSend', async (request, reply, payload) => {

        reply.header('X-Application', 'Fastify Hooks Demo')

        reply.header(
            'X-Hook-Order',
            'onRequest>preValidation>preHandler>onSend'
        )

        request.log.info({

            statusCode: reply.statusCode

        }, '[onSend] Adding response headers')

        return payload

    })


    fastify.addHook('onResponse', async (request, reply) => {

        request.log.info({

            method: request.method,

            route: request.routeOptions.url,

            statusCode: reply.statusCode,

            durationMs: Date.now() - request.startedAt

        }, '[onResponse] Response sent')

    })


    fastify.addHook('onError', async (request, reply, error) => {

        // onError runs before the custom error handler. It observes
        // the error; it must not send a response itself.

        request.log.error({

            method: request.method,

            route: request.routeOptions.url,

            error: error.message

        }, '[onError] Request failed')

    })


    // Application hooks

    fastify.addHook('onRoute', (routeOptions) => {

        fastify.log.info({

            method: routeOptions.method,

            url: routeOptions.url

        }, '[onRoute] Route registered')

    })


    fastify.addHook('onReady', async () => {

        fastify.log.info('[onReady] Application initialized successfully')

    })


    fastify.addHook('onListen', async () => {

        fastify.log.info('[onListen] Server is now accepting connections')

    })


    fastify.addHook('preClose', async () => {

        fastify.log.info('[preClose] Preparing for shutdown')

    })


    fastify.addHook('onClose', async () => {

        fastify.log.info('[onClose] Application cleanup completed')

    })

}


// fastify-plugin exposes these hooks to the root scope so they apply
// to every route registered afterwards.

export default fp(lifecyclePlugin, {

    name: 'lifecycle'

})
