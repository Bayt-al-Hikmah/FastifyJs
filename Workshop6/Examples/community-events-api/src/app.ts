import 'dotenv/config'

import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'

import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'

import { env } from './config/env.js'

import { isApiError } from './lib/api-error.js'
import { isPrismaError } from './lib/prisma-errors.js'
import { ensureCoverDirectory } from './lib/media-storage.js'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import multipartPlugin from './plugins/multipart.js'
import staticPlugin from './plugins/static.js'

import authRoutes from './routes/auth.js'
import eventRoutes from './routes/events.js'


type ValidationItem = {

    instancePath?: string

    message?: string

    params?: {
        missingProperty?: string
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

        reply.header(
            'X-Application',
            'Gather Community Events API'
        )

        return payload

    })


    fastify.addHook('onResponse', async (request, reply) => {

        request.log.info({

            statusCode: reply.statusCode

        }, 'Request completed')

    })


    fastify.addHook('onReady', async () => {

        await ensureCoverDirectory()

        fastify.log.info(
            'Private cover storage is ready'
        )

    })


    fastify.addHook('onClose', async () => {

        fastify.log.info(
            'Application shutdown completed'
        )

    })


    fastify.setErrorHandler(
        (error: FastifyError, request, reply) => {

            if (error.validation) {

                const validationErrors =
                    (error.validation as ValidationItem[])
                        .map((item) => ({

                            field:
                                item.instancePath
                                    ? item.instancePath.replace(
                                        /^\//,
                                        ''
                                    )
                                    : (
                                        item.params?.missingProperty ??
                                        'body'
                                    ),

                            message:
                                item.message ?? 'Invalid value.'

                        }))

                return reply.code(400).send({

                    message: 'Validation failed.',

                    errors: validationErrors

                })

            }


            if (isApiError(error)) {

                const body: {
                    message: string
                    errors?: typeof error.details
                } = {
                    message: error.message
                }

                if (error.details.length > 0) {
                    body.errors = error.details
                }

                return reply
                    .code(error.statusCode)
                    .send(body)

            }


            if (isPrismaError(error, 'P2002')) {

                return reply.code(409).send({
                    message: 'A record with these values already exists.'
                })

            }


            if (isPrismaError(error, 'P2025')) {

                return reply.code(404).send({
                    message: 'The requested resource was not found.'
                })

            }


            if (error.code === 'FST_REQ_FILE_TOO_LARGE') {

                return reply.code(413).send({
                    message: 'The uploaded file is too large.'
                })

            }


            if (
                error.statusCode &&
                error.statusCode >= 400 &&
                error.statusCode < 500
            ) {

                return reply
                    .code(error.statusCode)
                    .send({
                        message: error.message
                    })

            }


            request.log.error(
                error,
                'Unhandled request error'
            )


            if (wantsHtml(request)) {

                return reply
                    .code(500)
                    .type('text/html')
                    .send(
                        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
                        '<title>Something went wrong</title></head><body>' +
                        '<h1>Something went wrong</h1>' +
                        '<p>The server could not complete this request.</p>' +
                        '</body></html>'
                    )

            }


            return reply.code(500).send({
                message: 'Something went wrong on the server.'
            })

        }
    )


    fastify.setNotFoundHandler((request, reply) => {

        if (request.url.startsWith('/api/')) {

            return reply.code(404).send({
                message: 'API endpoint not found.'
            })

        }


        if (wantsHtml(request)) {

            return reply
                .code(404)
                .type('text/html')
                .send(
                    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
                    '<title>Page not found</title></head><body>' +
                    '<h1>Page not found</h1>' +
                    '<p>The page you are looking for does not exist.</p>' +
                    '<p><a href="/app/">Return to Gather</a></p>' +
                    '</body></html>'
                )

        }


        return reply.code(404).send({
            message: 'Route not found.'
        })

    })


    // CORS is only needed when a separate frontend origin consumes the API.
    fastify.register(cors, {

        origin: env.frontendOrigin ?? false,

        credentials: false,

        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE'
        ],

        allowedHeaders: [
            'Content-Type',
            'Authorization'
        ]

    })


    fastify.register(rateLimit, {

        max: 100,

        timeWindow: '15 minutes'

    })


    fastify.register(prismaPlugin)

    fastify.register(authPlugin)

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

    fastify.register(eventRoutes, {
        prefix: '/api'
    })


    return fastify

}
