import fp from 'fastify-plugin'

import fastifyStatic from '@fastify/static'

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import type { FastifyPluginAsync } from 'fastify'


const currentDirectory = dirname(
    fileURLToPath(import.meta.url)
)

const publicDirectory = join(
    currentDirectory,
    '..',
    '..',
    'public'
)


/**
 * The dashboard is served at /app/. Only public/ is exposed here; private
 * upload objects live in var/uploads/ and require a route-level check.
 */

const staticPlugin: FastifyPluginAsync = async (fastify) => {

    await fastify.register(fastifyStatic, {

        root: publicDirectory,

        prefix: '/app/',

        index: ['index.html'],

        setHeaders(reply, filePath) {

            if (filePath.endsWith('index.html')) {

                reply.header(
                    'Cache-Control',
                    'no-store'
                )

            }

        }

    })

}


export default fp(staticPlugin, {

    name: 'static'

})
