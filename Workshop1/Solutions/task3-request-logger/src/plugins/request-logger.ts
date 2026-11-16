import { performance } from 'node:perf_hooks'

import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
    interface FastifyRequest {
        startTime: number
    }
}

export type RequestLoggerOptions = {
    headerName?: string
}

const requestLoggerPlugin: FastifyPluginAsync<RequestLoggerOptions> = async (
    fastify,
    options
) => {

    const headerName = options.headerName ?? 'x-response-time'

    fastify.decorateRequest('startTime', 0)

    fastify.addHook('onRequest', async (request) => {

        request.startTime = performance.now()

        request.log.info(
            {
                method: request.method,
                url: request.url
            },
            'request started'
        )

    })

    fastify.addHook('onSend', async (request, reply, payload) => {

        const durationMs = performance.now() - request.startTime

        // Headers must be set before the response leaves the server.
        reply.header(headerName, `${durationMs.toFixed(3)} ms`)

        request.log.info(
            {
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                durationMs: Number(durationMs.toFixed(3))
            },
            'response prepared'
        )

        return payload

    })

    fastify.addHook('onResponse', async (request, reply) => {

        const durationMs = performance.now() - request.startTime

        request.log.info(
            {
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                durationMs: Number(durationMs.toFixed(3))
            },
            'request completed'
        )

    })

}

// fastify-plugin exposes the hooks to the parent scope so every route is covered.
export default fp(requestLoggerPlugin, {
    name: 'request-logger',
    fastify: '5.x'
})
