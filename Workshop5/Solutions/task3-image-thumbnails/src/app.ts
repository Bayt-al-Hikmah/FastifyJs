import 'dotenv/config'

import Fastify, { type FastifyInstance } from 'fastify'

import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'

import { MAX_ATTACHMENT_SIZE } from './config/uploads.js'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import staticPlugin from './plugins/static.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import taskRoutes from './routes/tasks.js'
import attachmentRoutes from './routes/attachments.js'


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

    fastify.addHook('onSend', async (_request, reply, payload) => {

        reply.header('X-Application', 'Task Manager')

        reply.header('X-Content-Type-Options', 'nosniff')

        reply.header('X-Frame-Options', 'DENY')

        reply.header('Referrer-Policy', 'no-referrer')

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

        const candidate = error as {
            validation?: unknown
            statusCode?: number
            message?: string
        }

        if (candidate.validation) {

            return reply.code(400).send({
                error: 'Request validation failed'
            })

        }

        if (
            candidate.statusCode &&
            candidate.statusCode >= 400 &&
            candidate.statusCode < 500
        ) {

            return reply.code(candidate.statusCode).send({
                error: candidate.message ?? 'Request failed'
            })

        }

        request.log.error(error)

        return reply.code(500).send({
            error: 'Internal server error'
        })

    })

    fastify.setNotFoundHandler(async (_request, reply) => {

        return reply.code(404).send({
            error: 'Route not found'
        })

    })

    fastify.register(prismaPlugin)

    fastify.register(authPlugin)

    fastify.register(rateLimit, {

        global: false

    })

    fastify.register(multipart, {

        limits: {

            fileSize: MAX_ATTACHMENT_SIZE,

            files: 1,

            fields: 0,

            parts: 1

        }

    })

    fastify.register(staticPlugin)

    fastify.register(authRoutes, {
        prefix: '/api/auth'
    })

    fastify.register(userRoutes, {
        prefix: '/api/users'
    })

    fastify.register(taskRoutes, {
        prefix: '/api'
    })

    fastify.register(attachmentRoutes, {
        prefix: '/api'
    })

    return fastify

}
