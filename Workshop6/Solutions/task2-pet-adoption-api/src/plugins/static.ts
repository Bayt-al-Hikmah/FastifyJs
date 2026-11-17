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
 * The Pawprint dashboard is served at /app/. Uploaded objects live in
 * var/uploads/objects and are never exposed as static files.
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
