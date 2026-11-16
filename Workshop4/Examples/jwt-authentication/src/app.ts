import 'dotenv/config'

import Fastify, { type FastifyInstance } from 'fastify'

import rateLimit from '@fastify/rate-limit'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'

import authRoutes from './routes/auth.js'
import protectedRoutes from './routes/protected.js'


export function buildApp(): FastifyInstance {

    const fastify = Fastify({

        logger: true

    })


    // Request hook

    fastify.addHook('onRequest', async (request) => {

        request.log.info({

            method: request.method,

            route: request.routeOptions.url

        }, 'Incoming request')

    })


    // Response hook

    fastify.addHook('onSend', async (request, reply, payload) => {

        reply.header('X-Application', 'JWT Authentication Example')

        return payload

    })


    // After-response hook

    fastify.addHook('onResponse', async (request, reply) => {

        request.log.info({

            statusCode: reply.statusCode

        }, 'Request completed')

    })


    // Application hooks

    fastify.addHook('onReady', async () => {

        fastify.log.info('Application initialized successfully')

    })


    fastify.addHook('onClose', async () => {

        fastify.log.info('Application shutdown completed')

    })


    fastify.setErrorHandler((error, request, reply) => {

        if (error.validation) {

            return reply.code(400).send({
                error: 'Request validation failed'
            })

        }

        if (
            error.statusCode &&
            error.statusCode >= 400 &&
            error.statusCode < 500
        ) {

            return reply.code(error.statusCode).send({
                error: error.message
            })

        }

        request.log.error(error)

        return reply.code(500).send({
            error: 'Internal server error'
        })

    })


    fastify.setNotFoundHandler(async (request, reply) => {

        return reply.code(404).send({
            error: 'Route not found'
        })

    })


    // The database plugin must be available before the auth plugin
    // retrieves users, and both must be available before the routes.

    fastify.register(prismaPlugin)

    fastify.register(authPlugin)

    fastify.register(rateLimit, {

        global: false

    })

    fastify.register(authRoutes, {

        prefix: '/api/auth'

    })

    fastify.register(protectedRoutes, {

        prefix: '/api/protected'

    })


    return fastify

}
