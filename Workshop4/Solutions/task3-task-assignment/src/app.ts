import 'dotenv/config'

import Fastify, { type FastifyInstance } from 'fastify'

import rateLimit from '@fastify/rate-limit'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import taskRoutes from './routes/tasks.js'


export function buildApp(): FastifyInstance {

    const fastify = Fastify({

        logger: true

    })


    fastify.addHook('onRequest', async (request) => {

        request.log.info({

            method: request.method,

            route: request.routeOptions.url

        }, 'Incoming request')

    })


    fastify.addHook('onSend', async (request, reply, payload) => {

        reply.header('X-Application', 'Task Manager')

        return payload

    })


    fastify.addHook('onResponse', async (request, reply) => {

        request.log.info({

            statusCode: reply.statusCode

        }, 'Request completed')

    })


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


    fastify.register(prismaPlugin)

    fastify.register(authPlugin)

    fastify.register(rateLimit, {

        global: false

    })

    fastify.register(authRoutes, {

        prefix: '/api/auth'

    })

    fastify.register(userRoutes, {

        prefix: '/api/users'

    })

    fastify.register(taskRoutes, {

        prefix: '/api'

    })


    return fastify

}
