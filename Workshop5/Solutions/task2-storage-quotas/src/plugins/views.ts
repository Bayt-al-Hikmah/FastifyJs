import fp from 'fastify-plugin'

import view from '@fastify/view'

import handlebars from 'handlebars'

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import type { FastifyPluginAsync } from 'fastify'


const currentDirectory = dirname(
    fileURLToPath(import.meta.url)
)

const viewsDirectory = join(
    currentDirectory,
    '..',
    '..',
    'views'
)


const viewPlugin: FastifyPluginAsync = async (fastify) => {

    await fastify.register(view, {

        engine: {
            handlebars
        },

        root: viewsDirectory,

        viewExt: 'hbs'

    })

}


export default fp(viewPlugin, {

    name: 'views'

})
