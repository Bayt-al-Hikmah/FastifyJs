import type { FastifyPluginAsync } from 'fastify'

import { GENRES } from '../types/book.js'


/**
 * Small metadata endpoints. Keeping these separate from /books shows that a
 * resource collection and its supporting vocabulary can evolve independently.
 */

const metaRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get('/genres', async (_request, reply) => {

        return reply.code(200).send({

            message: 'Genres retrieved successfully.',

            data: {

                genres: GENRES

            }

        })

    })

}

export default metaRoutes
