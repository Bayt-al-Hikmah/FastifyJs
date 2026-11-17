import 'dotenv/config'

import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'

import rateLimit from '@fastify/rate-limit'

import corsPlugin from './plugins/cors.js'
import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import multipartPlugin from './plugins/multipart.js'
import staticPlugin from './plugins/static.js'

import authRoutes from './routes/auth.js'
import petRoutes from './routes/pets.js'

import { ApiError, type FieldError } from './lib/api-error.js'
import { ensureStorageDirectories } from './lib/image-storage.js'
import { isPrismaError } from './lib/prisma-errors.js'


type ValidationEntry = {

    instancePath?: string

    message?: string

}


function friendlyValidationMessage(message: string): string {

    if (message.includes('must have required property')) {
        return 'This field is required.'
    }

    if (message.includes('must NOT have additional properties')) {
        return 'This field is not allowed.'
    }

    if (message.includes('must match pattern')) {
        return 'This value contains invalid characters.'
    }

    return message

}


function describeValidationError(entry: ValidationEntry): FieldError {

    const message = entry.message ?? 'Invalid value.'

    const requiredMatch = /required property '([^']+)'/.exec(message)


    if (requiredMatch) {

        return {
            field: requiredMatch[1],
            message: 'This field is required.'
        }

    }


    const parts = (entry.instancePath ?? '')
        .split('/')
        .filter((part) => part.length > 0)


    if (
        parts.length > 0 &&
        ['body', 'querystring', 'params'].includes(parts[0])
    ) {
        parts.shift()
    }


    return {

        field: parts.join('.') || 'request',

        message: friendlyValidationMessage(message)

    }

}


function wantsHtml(
    request: { headers: { accept?: string }; url: string }
): boolean {

    if (request.url.startsWith('/api/')) {
        return false
    }

    return request.headers.accept?.includes('text/html') === true

}


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

        reply.header('X-Application', 'Pawprint')

        return payload

    })


    fastify.addHook('onReady', async () => {

        await ensureStorageDirectories()

        fastify.log.info('Private pet photo storage is ready')

    })


    fastify.addHook('onClose', async () => {

        fastify.log.info('Application shutdown completed')

    })


    fastify.setErrorHandler((error: FastifyError, request, reply) => {

        if (error.validation) {

            const errors = error.validation.map(
                (entry) => describeValidationError(
                    entry as ValidationEntry
                )
            )

            return reply.code(400).send({
                message: 'Validation failed.',
                errors
            })

        }


        if (error instanceof ApiError) {

            const payload: {
                message: string
                errors?: FieldError[]
            } = {
                message: error.message
            }

            if (error.details) {
                payload.errors = error.details
            }

            return reply.code(error.statusCode).send(payload)

        }


        if (isPrismaError(error, 'P2002')) {

            return reply.code(409).send({
                message: 'A record with these details already exists.'
            })

        }


        if (isPrismaError(error, 'P2025')) {

            return reply.code(404).send({
                message: 'The requested resource was not found.'
            })

        }


        if (
            error.code === 'FST_REQ_FILE_TOO_LARGE' ||
            error.statusCode === 413
        ) {

            return reply.code(413).send({
                message: 'The uploaded file is too large.'
            })

        }


        if (error.code === 'FST_INVALID_MULTIPART_CONTENT_TYPE') {

            return reply.code(415).send({
                message: 'This endpoint expects multipart/form-data.'
            })

        }


        if (
            error.statusCode &&
            error.statusCode >= 400 &&
            error.statusCode < 500
        ) {

            return reply.code(error.statusCode).send({
                message: error.message || 'The request could not be completed.'
            })

        }


        request.log.error(error)


        return reply.code(500).send({
            message: 'An unexpected error occurred. Please try again later.'
        })

    })


    fastify.setNotFoundHandler(async (request, reply) => {

        if (request.url.startsWith('/api/')) {

            return reply.code(404).send({
                message: 'API endpoint not found.'
            })

        }


        if (wantsHtml(request)) {

            return reply
                .code(404)
                .type('text/html; charset=utf-8')
                .send(`<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page not found · Pawprint</title>
    <style>
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fff8f0; color: #4a2518; font-family: system-ui, sans-serif; }
        main { max-width: 34rem; padding: 2rem; text-align: center; }
        a { color: #b45309; }
    </style>
</head>
<body>
    <main>
        <h1>Page not found</h1>
        <p>That page is not part of the Pawprint dashboard.</p>
        <p><a href="/app/">Return to the pets</a></p>
    </main>
</body>
</html>`)

        }


        return reply.code(404).send({
            message: 'Page not found.'
        })

    })


    fastify.register(corsPlugin)

    fastify.register(prismaPlugin)

    fastify.register(authPlugin)

    fastify.register(rateLimit, {

        global: true,

        max: 200,

        timeWindow: '15 minutes'

    })

    fastify.register(multipartPlugin)

    fastify.register(staticPlugin)


    fastify.get('/', async (_request, reply) => {

        return reply.redirect('/app/')

    })


    fastify.get('/app', async (_request, reply) => {

        return reply.redirect('/app/')

    })


    fastify.register(authRoutes, {
        prefix: '/api/auth'
    })

    fastify.register(petRoutes, {
        prefix: '/api'
    })


    return fastify

}
