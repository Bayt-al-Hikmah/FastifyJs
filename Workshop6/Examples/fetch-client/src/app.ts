import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'

import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'

import { fileURLToPath } from 'node:url'

import {
    dirname,
    join
} from 'node:path'

import {
    CORS_ORIGIN,
    MAX_IMAGE_SIZE
} from './config.js'

import {
    ApiError,
    type FieldError
} from './lib/api-error.js'

import { ensureUploadDirectories } from './lib/image-store.js'

import noteRoutes from './routes/notes.js'


const currentDirectory = dirname(
    fileURLToPath(import.meta.url)
)

const publicDirectory = join(
    currentDirectory,
    '..',
    'public'
)


/**
 * Fastify's validation errors use JSON pointers such as "/body/title".
 * The frontend wants a plain field name it can show next to an input.
 */

function fieldNameFromPointer(
    instancePath: string
): string {

    const segments = instancePath
        .split('/')
        .filter(Boolean)

    if (segments.length === 0) {
        return 'request'
    }

    const lastSegment = segments[segments.length - 1]

    return lastSegment.replace(/\[\d+\]$/, '')

}


function wantsHtml(
    request: {
        headers: { accept?: string }
        url: string
    }
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

        reply.header('X-Application', 'Field Notes')

        return payload

    })


    fastify.addHook('onReady', async () => {

        await ensureUploadDirectories()

        fastify.log.info('Private image storage is ready')

    })


    fastify.setErrorHandler(
        (error: FastifyError, request, reply) => {


            // JSON Schema failures become a field-by-field validation envelope.

            if (error.validation) {

                const errors: FieldError[] =
                    error.validation.map((item) => ({

                        field: fieldNameFromPointer(
                            item.instancePath ?? ''
                        ),

                        message: item.message ?? 'Invalid value.'

                    }))

                return reply.code(400).send({

                    message: 'Validation failed.',

                    errors

                })

            }


            if (error instanceof ApiError) {

                const body: {
                    message: string
                    errors?: FieldError[]
                } = {

                    message: error.message

                }

                if (error.errors) {
                    body.errors = error.errors
                }

                return reply
                    .code(error.statusCode)
                    .send(body)

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


            request.log.error(error)

            return reply.code(500).send({
                message: 'Internal server error.'
            })

        }
    )


    fastify.setNotFoundHandler(async (request, reply) => {

        if (wantsHtml(request)) {

            const page = [
                '<!doctype html>',
                '<html lang="en">',
                '<head>',
                '<meta charset="utf-8">',
                '<meta name="viewport" content="width=device-width, initial-scale=1">',
                '<title>Page not found · Field Notes</title>',
                '<link rel="stylesheet" href="/app/css/style.css">',
                '</head>',
                '<body>',
                '<main class="not-found">',
                '<p class="eyebrow">404</p>',
                '<h1>This page is off the map.</h1>',
                '<p>The note or page you were looking for could not be found.</p>',
                '<a class="button button-primary" href="/app/">Back to Field Notes</a>',
                '</main>',
                '</body>',
                '</html>'
            ].join('\n')

            return reply
                .code(404)
                .type('text/html')
                .send(page)

        }

        return reply.code(404).send({
            message: 'Route not found.'
        })

    })


    // CORS is included so the API could be consumed from a separate origin.
    // Here the dashboard is served by the same process, so it is a teaching aid.

    fastify.register(cors, {

        origin: CORS_ORIGIN

    })


    // Multipart limits are the first line of defence. The image store repeats
    // the size and signature checks on the bytes that actually arrive.

    fastify.register(multipart, {

        throwFileSizeLimit: false,

        limits: {

            fieldNameSize: 100,

            fieldSize: 1024,

            fields: 4,

            files: 1,

            fileSize: MAX_IMAGE_SIZE,

            headerPairs: 100,

            parts: 5

        }

    })


    fastify.register(fastifyStatic, {

        root: publicDirectory,

        prefix: '/app/',

        index: ['index.html'],

        setHeaders(reply, filePath) {

            if (filePath.endsWith('index.html')) {

                reply.header(
                    'Cache-Control',
                    'no-store'
                )

            }

        }

    })


    fastify.get('/', async (_request, reply) => {

        return reply.redirect('/app/')

    })


    fastify.get('/app', async (_request, reply) => {

        return reply.redirect('/app/')

    })


    fastify.register(noteRoutes, {

        prefix: '/api'

    })


    return fastify

}
