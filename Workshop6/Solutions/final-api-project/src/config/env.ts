/**
 * Central application configuration. Every deployment variable is read here
 * so route modules never reach into process.env directly.
 */

export const HOST = process.env.HOST ?? '127.0.0.1'

export const PORT = Number(process.env.PORT ?? 3015)


/**
 * The bundled dashboard is served by this process. CORS is only needed when a
 * separate frontend origin is configured, and then only this origin is trusted.
 */

export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN?.trim() || null
