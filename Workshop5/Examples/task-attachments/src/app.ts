import 'dotenv/config'

import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'

import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import staticPlugin from './plugins/static.js'
import viewPlugin from './plugins/views.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import taskRoutes from './routes/tasks.js'
import attachmentRoutes from './routes/attachments.js'

import {
    MAX_ATTACHMENT_SIZE,
    MAX_FILES_PER_REQUEST
} from './config/uploads.js'

import { ensureStorageDirectories } from './lib/storage-files.js'


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

        reply.header('X-Application', 'Task Attachments')

        return payload

    })


    fastify.addHook('onResponse', async (request, reply) => {

        request.log.info({
            statusCode: reply.statusCode
        }, 'Request completed')

    })


    fastify.addHook('onReady', async () => {

        await ensureStorageDirectories()

        fastify.log.info('Private upload storage is ready')

    })


    fastify.addHook('onClose', async () => {

        fastify.log.info('Application shutdown completed')

    })


    fastify.setErrorHandler((error: FastifyError, request, reply) => {

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


        if (wantsHtml(request)) {

            return reply.code(500).view('error', {
                statusCode: 500,
                title: 'Something went wrong',
                message: 'The server could not complete this request.'
            })

        }


        return reply.code(500).send({
            error: 'Internal server error'
        })

    })


    fastify.setNotFoundHandler(async (request, reply) => {

        if (wantsHtml(request)) {

            return reply.code(404).view('error', {
                statusCode: 404,
                title: 'Page not found',
                message: 'The page you are looking for does not exist.'
            })

        }


        return reply.code(404).send({
            error: 'Route not found'
        })

    })


    fastify.register(prismaPlugin)

    fastify.register(authPlugin)

    fastify.register(rateLimit, {

        global: false

    })


    // The multipart limits are the first line of defense. Route validation
    // repeats the size and type checks because multipart headers are untrusted.

    fastify.register(multipart, {

        throwFileSizeLimit: false,

        limits: {

            fieldNameSize: 100,

            fieldSize: 1024,

            fields: 0,

            files: MAX_FILES_PER_REQUEST,

            fileSize: MAX_ATTACHMENT_SIZE,

            headerPairs: 100,

            parts: MAX_FILES_PER_REQUEST

        }

    })


    fastify.register(staticPlugin)

    fastify.register(viewPlugin)


    fastify.get('/', async (_request, reply) => {

        return reply.redirect('/app/')

    })


    fastify.get('/app', async (_request, reply) => {

        return reply.redirect('/app/')

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

    fastify.register(attachmentRoutes, {
        prefix: '/api'
    })


    return fastify

}


function wantsHtml(
    request: { headers: { accept?: string }; url: string }
): boolean {

    if (request.url.startsWith('/api/')) {
        return false
    }

    return (
        request.headers.accept?.includes('text/html') === true
    )

}
