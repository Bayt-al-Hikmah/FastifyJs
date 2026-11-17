import 'dotenv/config'

import Fastify, {
    type FastifyError,
    type FastifyInstance
} from 'fastify'

import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'

import { FRONTEND_ORIGIN } from './config/env.js'

import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import multipartPlugin from './plugins/multipart.js'
import staticPlugin from './plugins/static.js'

import authRoutes from './routes/auth.js'
import recipeRoutes from './routes/recipes.js'
import favoriteRoutes from './routes/favorites.js'
import photoRoutes from './routes/photos.js'

import {
    ApiError,
    type ValidationIssue
} from './lib/api-error.js'

import { isPrismaError } from './lib/prisma-errors.js'

import { ensureStorageDirectories } from './lib/storage-files.js'


type ValidationIssueLike = {

    instancePath?: string

    message?: string

    keyword?: string

    params?: Record<string, unknown>

}


/**
 * Convert an AJV issue into the Workshop 6 validation envelope. The `field`
 * value is built from the JSON pointer so the UI can highlight the input that
 * caused the problem.
 */

function toValidationIssue(
    issue: ValidationIssueLike
): ValidationIssue {

    const field = (issue.instancePath ?? '')
        .replace(/^\//, '')
        .split('/')
        .filter(Boolean)
        .join('.') || 'request'


    let message = 'The value is invalid.'


    if (issue.keyword === 'required') {

        const missing = issue.params?.missingProperty

        message = `${String(missing ?? 'field')} is required.`

    } else if (issue.keyword === 'additionalProperties') {

        const extra = issue.params?.additionalProperty

        message = `${String(extra ?? 'field')} is not an allowed field.`

    } else if (issue.message) {

        message = issue.message.charAt(0).toUpperCase() +
            issue.message.slice(1)

        if (!message.endsWith('.')) {
            message += '.'
        }

    }


    return { field, message }

}


function notFoundHtml(): string {

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page not found · Mise</title>
    <style>
        body { margin: 0; min-height: 100vh; display: grid; place-items: center;
            background: #f6f1e6; color: #26301f; font-family: Georgia, serif; }
        main { max-width: 34rem; padding: 2.5rem; text-align: center; }
        h1 { font-size: 2.1rem; margin-bottom: 0.5rem; }
        p { color: #6a6f5d; font-family: system-ui, sans-serif; }
        a { color: #9c3b2e; font-weight: 700; }
    </style>
</head>
<body>
    <main>
        <h1>Nothing in this drawer.</h1>
        <p>The page you asked for does not exist.</p>
        <a href="/app/">Return to Mise</a>
    </main>
</body>
</html>`

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


    fastify.addHook('onReady', async () => {

        await ensureStorageDirectories()

        fastify.log.info('Private upload storage is ready')

    })


    /**
     * One central error handler keeps safe messages and consistent envelopes.
     * Validation, Prisma, multipart, and known 4xx errors are translated;
     * anything unexpected is logged and replaced with a generic 500.
     */

    fastify.setErrorHandler((error: FastifyError, request, reply) => {

        if (error.validation) {

            const issues = (error.validation as ValidationIssueLike[])
                .map(toValidationIssue)

            return reply.code(400).send({
                message: 'Validation failed.',
                errors: issues
            })

        }


        if (error instanceof ApiError) {

            const body: {
                message: string
                errors?: ValidationIssue[]
            } = {
                message: error.message
            }


            if (error.errors) {
                body.errors = error.errors
            }

            return reply.code(error.statusCode).send(body)

        }


        if (isPrismaError(error, 'P2002')) {

            return reply.code(409).send({
                message: 'A record with these unique values already exists.'
            })

        }


        if (isPrismaError(error, 'P2025')) {

            return reply.code(404).send({
                message: 'The requested record was not found.'
            })

        }


        if (
            error.code === 'FST_REQ_FILE_TOO_LARGE' ||
            error.code === 'FST_FILES_LIMIT'
        ) {

            return reply.code(413).send({
                message: 'The uploaded file is too large or too numerous.'
            })

        }


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
            message: 'An unexpected error occurred. Please try again later.'
        })

    })


    fastify.setNotFoundHandler(async (request, reply) => {

        if (request.url.startsWith('/api/')) {

            return reply.code(404).send({
                message: 'Endpoint not found.'
            })

        }

        return reply
            .code(404)
            .type('text/html; charset=utf-8')
            .send(notFoundHtml())

    })


    fastify.register(prismaPlugin)

    fastify.register(authPlugin)

    fastify.register(multipartPlugin)


    if (FRONTEND_ORIGIN) {

        fastify.register(cors, {

            origin: FRONTEND_ORIGIN,

            credentials: false,

            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],

            allowedHeaders: ['Content-Type', 'Authorization']

        })

    }


    // Rate limits apply to API traffic only; static dashboard assets are
    // deliberately excluded so a busy page does not exhaust its own budget.

    fastify.register(rateLimit, {

        max: 100,

        timeWindow: '15 minutes',

        allowList: (request) => !request.url.startsWith('/api/'),

        errorResponseBuilder: (_request, context) => ({
            message: `Too many requests. Try again ${context.after}.`
        })

    })


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

    fastify.register(recipeRoutes, {
        prefix: '/api'
    })

    fastify.register(favoriteRoutes, {
        prefix: '/api'
    })

    fastify.register(photoRoutes, {
        prefix: '/api'
    })


    return fastify

}
