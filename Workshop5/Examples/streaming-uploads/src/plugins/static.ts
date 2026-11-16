import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'
import { resolve } from 'node:path'

import type { FastifyPluginAsync } from 'fastify'

const staticPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.register(fastifyStatic, {
        root: resolve(process.cwd(), 'public'),
        prefix: '/static/'
    })
}

export default fp(staticPlugin, {
    name: 'static'
})
