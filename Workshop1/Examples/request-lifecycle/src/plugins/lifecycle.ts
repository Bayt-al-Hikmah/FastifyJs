import { performance } from 'node:perf_hooks'

import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
    interface FastifyRequest {
        lifecycle: string[]
        startTime: number
    }
}

const lifecyclePlugin: FastifyPluginAsync = async (fastify) => {

    fastify.addHook('onRequest', async (request) => {

        // Assign a fresh array so requests never share lifecycle state.
        request.lifecycle = ['onRequest']
        request.startTime = performance.now()

        request.log.info(
            { method: request.method, url: request.url },
            'onRequest'
        )

    })

    fastify.addHook('preParsing', async (request) => {

        request.lifecycle.push('preParsing')
        request.log.info('preParsing')

    })

    fastify.addHook('preValidation', async (request) => {

        request.lifecycle.push('preValidation')
        request.log.info('preValidation')

    })

    fastify.addHook('preHandler', async (request) => {

        request.lifecycle.push('preHandler')
        request.log.info('preHandler')

    })

    fastify.addHook('preSerialization', async (request) => {

        request.lifecycle.push('preSerialization')
        request.log.info('preSerialization')

    })

    fastify.addHook('onSend', async (request, reply, payload) => {

        request.lifecycle.push('onSend')

        const durationMs = performance.now() - request.startTime
        reply.header('x-response-time', `${durationMs.toFixed(3)} ms`)
        reply.header('x-lifecycle', request.lifecycle.join(' -> '))

        request.log.info('onSend')

        return payload

    })

    fastify.addHook('onResponse', async (request, reply) => {

        request.lifecycle.push('onResponse')

        const durationMs = performance.now() - request.startTime
        request.log.info(
            {
                statusCode: reply.statusCode,
                durationMs: Number(durationMs.toFixed(3)),
                lifecycle: request.lifecycle
            },
            'onResponse'
        )

    })

    fastify.addHook('onError', async (request, _reply, error) => {

        request.log.error({ err: error }, 'onError')

    })

}

// fastify-plugin keeps the hooks in the parent scope, so they apply to every route.
export default fp(lifecyclePlugin, {
    name: 'lifecycle-demo',
    fastify: '5.x'
})
