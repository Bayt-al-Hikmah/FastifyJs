import path from 'node:path'
import { fileURLToPath } from 'node:url'

import staticPlugin from '@fastify/static'
import fp from 'fastify-plugin'

import type { FastifyPluginAsync } from 'fastify'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.resolve(currentDirectory, '..', '..', 'public')

const staticFilesPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(staticPlugin, {
        root: publicRoot,
        prefix: '/assets/'
    })
}

export default fp(staticFilesPlugin, {
    name: 'static-files'
})
