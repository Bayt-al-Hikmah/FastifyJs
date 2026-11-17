/**
 * Central configuration for the Community Library API.
 *
 * This example has no database and no secrets, so the environment file is
 * optional. Keeping configuration in one small module makes it obvious which
 * values a reader can change while experimenting.
 */

export const PORT = Number(process.env.PORT ?? 3010)

export const HOST = process.env.HOST ?? '0.0.0.0'


/**
 * @fastify/cors accepts a string origin, `true` (reflect the request origin),
 * or `false` (disable cross-origin responses).
 */

const configuredOrigin = (process.env.CORS_ORIGIN ?? 'true').trim()

export const CORS_ORIGIN: string | boolean =
    configuredOrigin === 'true'
        ? true
        : configuredOrigin === 'false'
            ? false
            : configuredOrigin


/**
 * A single in-memory rate-limit bucket protects every /api route. The static
 * API explorer under /app/ is deliberately not rate limited.
 */

export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 100)

export const RATE_LIMIT_WINDOW =
    process.env.RATE_LIMIT_WINDOW ?? '15 minutes'


/**
 * Pagination defaults. `MAX_LIMIT` is repeated in the JSON Schema so that the
 * runtime validator rejects oversized requests before they reach the service.
 */

export const DEFAULT_PAGE = 1

export const DEFAULT_LIMIT = 10

export const MAX_LIMIT = 50
