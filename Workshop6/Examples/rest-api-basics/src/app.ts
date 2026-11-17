import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'

import fastifyStatic from '@fastify/static'

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ApiError, type ValidationIssue } from './lib/api-error.js'
import apiRoutes from './routes/api.js'


const currentDirectory = dirname(
    fileURLToPath(import.meta.url)
)

const publicDirectory = join(
    currentDirectory,
    '..',
    '..',
    'public'
)


/**
 * Turns Ajv's `/body/title` style path into a friendlier `body.title` field
 * name for the validation error envelope.
 */

function fieldFromInstancePath(
    instancePath?: string
): string {

    if (!instancePath) {
        return 'request'
    }

    const cleaned = instancePath
        .replace(/^\//, '')
        .replace(/\//g, '.')

    return cleaned || 'request'

}


function notFoundPage(): string {

    return [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>Page not found · Shelf</title>',
        '</head>',
        '<body style="font-family: system-ui, sans-serif; background: #0b1120; color: #f8fafc; padding: 4rem 1.5rem;">',
        '<h1>Page not found</h1>',
        '<p>The page you requested does not exist.</p>',
        '<p><a href="/app/" style="color: #fbbf24;">Open the API explorer</a></p>',
        '</body>',
        '</html>'
    ].join('')

}


function isApiUrl(url: string): boolean {

    return url === '/api' || url.startsWith('/api/')

}


export function buildApp(): FastifyInstance {

    const fastify = Fastify({

        logger: true

    })


    /**
     * One place decides how every error looks. Technical details are logged
     * on the server; clients only ever receive safe, predictable messages.
     */

    fastify.setErrorHandler((
        error: FastifyError,
        request,
        reply
    ) => {

        if (error.validation) {

            const errors: ValidationIssue[] =
                error.validation.map((item) => {

                    // A missing required property is reported at the parent
                    // path, so prefer Ajv's `missingProperty` when present.
                    const params = item.params as
                        { missingProperty?: unknown } | undefined

                    const missingProperty =
                        typeof params?.missingProperty === 'string'
                            ? params.missingProperty
                            : ''

                    return {

                        field: missingProperty ||
                            fieldFromInstancePath(item.instancePath),

                        message: item.message ?? 'Invalid value.'

                    }

                })

            return reply.code(400).send({

                message: 'Validation failed.',

                errors

            })

        }


        if (error instanceof ApiError) {

            return reply.code(error.statusCode).send({

                message: error.message

            })

        }


        // Known HTTP errors (for example a 413 from the body parser) already
        // carry a safe message, so pass them through in the common envelope.
        if (
            error.statusCode &&
            error.statusCode >= 400 &&
            error.statusCode < 500
        ) {

            return reply.code(error.statusCode).send({

                message: error.message

            })

        }


        request.log.error(error)

        return reply.code(500).send({

            message: 'Something went wrong on the server.'

        })

    })


    fastify.setNotFoundHandler((request, reply) => {

        if (isApiUrl(request.url)) {

            return reply.code(404).send({

                message: 'API endpoint not found.'

            })

        }

        return reply.code(404)
            .type('text/html')
            .send(notFoundPage())

    })


    /**
     * The browser explorer is a static asset served from the same origin as
     * the API. It lives outside the /api plugin, so CORS and rate limiting do
     * not apply to it.
     */

    fastify.register(fastifyStatic, {

        root: publicDirectory,

        prefix: '/app/',

        index: ['index.html'],

        setHeaders(reply, filePath) {

            if (filePath.endsWith('index.html')) {

                reply.header('Cache-Control', 'no-store')

            }

        }

    })


    fastify.get('/', async (_request, reply) => {

        return reply.redirect('/app/')

    })


    fastify.get('/app', async (_request, reply) => {

        return reply.redirect('/app/')

    })


    fastify.register(apiRoutes, { prefix: '/api' })


    return fastify

}
