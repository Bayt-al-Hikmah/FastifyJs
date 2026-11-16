import fp from 'fastify-plugin'
import view from '@fastify/view'
import handlebars from 'handlebars'
import { resolve } from 'node:path'

import type { FastifyPluginAsync } from 'fastify'


const viewsPlugin: FastifyPluginAsync = async (fastify) => {

    fastify.register(view, {

        engine: {

            handlebars

        },

        root: resolve(process.cwd(), 'views'),

        includeViewExtension: true,

        layout: 'layouts/main.hbs',

        options: {

            partials: {

                navbar: 'partials/navbar.hbs',

                footer: 'partials/footer.hbs',

                'inquiry-row': 'partials/inquiry-row.hbs'

            }

        }

    })

}


export default fp(viewsPlugin)
