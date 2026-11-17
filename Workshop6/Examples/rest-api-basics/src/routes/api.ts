import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import type { FastifyPluginAsync } from 'fastify'

import { CORS_ORIGIN, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW } from '../config.js'
import bookRoutes from './books.js'
import metaRoutes from './meta.js'


/**
 * The API is registered as one encapsulated plugin with the `/api` prefix.
 *
 * CORS and rate limiting are registered inside this scope, so they apply to
 * API endpoints only. The static explorer under /app/ is served outside this
 * plugin and is untouched by either mechanism.
 */

const apiRoutes: FastifyPluginAsync = async (fastify) => {

    await fastify.register(cors, {

        origin: CORS_ORIGIN,

        credentials: false,

        methods: [
            'GET',
            'POST',
            'PATCH',
            'DELETE',
            'OPTIONS'
        ],

        allowedHeaders: [
            'Content-Type',
            'Authorization'
        ]

    })


    await fastify.register(rateLimit, {

        max: RATE_LIMIT_MAX,

        timeWindow: RATE_LIMIT_WINDOW,

        // Keep 429 responses in the same envelope as every other API error.
        errorResponseBuilder: () => ({

            message: 'Too many requests. Please wait a moment and try again.'

        })

    })


    await fastify.register(bookRoutes)

    await fastify.register(metaRoutes)

}

export default apiRoutes
