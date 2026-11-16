import 'dotenv/config'
import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'
import rateLimit from '@fastify/rate-limit'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import staticPlugin from './plugins/static.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import taskRoutes from './routes/tasks.js'
import attachmentRoutes from './routes/attachments.js'

import { ensureBucketExists } from './lib/s3-storage.js'

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
        reply.header('X-Application', 'Object Storage Attachments')
        return payload
    })

    fastify.addHook('onReady', async () => {
        await ensureBucketExists()
        fastify.log.info('S3/MinIO bucket verification completed')
    })

    fastify.setErrorHandler((error: FastifyError, request, reply) => {
        if (error.validation) {
            return reply.code(400).send({
                error: 'Request validation failed'
            })
        }

        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
            return reply.code(error.statusCode).send({
                error: error.message
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
    fastify.register(rateLimit, { global: false })
    fastify.register(staticPlugin)

    fastify.get('/', async (_request, reply) => {
        return reply.redirect('/app/')
    })

    fastify.get('/app', async (_request, reply) => {
        return reply.redirect('/app/')
    })

    fastify.register(authRoutes, { prefix: '/api/auth' })
    fastify.register(userRoutes, { prefix: '/api/users' })
    fastify.register(taskRoutes, { prefix: '/api' })
    fastify.register(attachmentRoutes, { prefix: '/api' })

    return fastify
}
