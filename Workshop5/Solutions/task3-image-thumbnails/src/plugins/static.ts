import fp from 'fastify-plugin'

import fastifyStatic from '@fastify/static'

import { fileURLToPath } from 'node:url'

import type { FastifyPluginAsync } from 'fastify'


const publicDirectory = fileURLToPath(
    new URL('../../public/app', import.meta.url)
)


const staticPlugin: FastifyPluginAsync = async (fastify) => {

    await fastify.register(fastifyStatic, {

        root: publicDirectory,

        prefix: '/app/',

        index: ['index.html'],

        cacheControl: true,

        maxAge: '1h'

    })

    fastify.get('/', async (_request, reply) => {

        return reply.redirect('/app/')

    })

    fastify.get('/app', async (_request, reply) => {

        return reply.redirect('/app/')

    })

}


export default fp(staticPlugin, {

    name: 'static'

})
