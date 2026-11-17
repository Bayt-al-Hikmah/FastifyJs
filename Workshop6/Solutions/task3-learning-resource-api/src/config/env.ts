/**
 * Central application configuration.
 *
 * Keeping environment reads in one module makes it obvious which variables a
 * deployment must provide and avoids scattering `process.env` across routes.
 */

export const HOST = process.env.HOST ?? '127.0.0.1'

export const PORT = Number(process.env.PORT ?? 3013)


/**
 * When set, the API allows browser requests from this single trusted origin.
 * The bundled dashboard is served by this process, so CORS is optional.
 */

export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN?.trim() || null
