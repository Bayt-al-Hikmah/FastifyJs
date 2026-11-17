import fp from 'fastify-plugin'
import cors from '@fastify/cors'

import type { FastifyPluginAsync } from 'fastify'


/**
 * A comma-separated FRONTEND_ORIGIN keeps cross-origin development possible
 * without ever falling back to a wildcard. Same-origin /app/ requests do not
 * need CORS headers at all.
 */
const corsPlugin: FastifyPluginAsync = async (fastify) => {

    const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)


    await fastify.register(cors, {

        origin: allowedOrigins.length > 0 ? allowedOrigins : false,

        credentials: false,

        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

        allowedHeaders: ['Content-Type', 'Authorization']

    })

}


export default fp(corsPlugin, {

    name: 'cors'

})
