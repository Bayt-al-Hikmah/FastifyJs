import 'dotenv/config'

import { resolve } from 'node:path'


/**
 * Read the port from the environment without trusting it blindly. A bad value
 * should fail at startup with a clear message rather than surfacing later as a
 * confusing runtime error.
 */

function readPort(
    value: string | undefined,
    fallback: number
): number {

    if (!value) {
        return fallback
    }

    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        throw new Error('PORT must be an integer between 1 and 65535')
    }

    return parsed

}


export const HOST = process.env.HOST ?? '127.0.0.1'

export const PORT = readPort(process.env.PORT, 3020)

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*'

export const UPLOAD_DIR = resolve(
    process.env.UPLOAD_DIR ?? './var/uploads'
)


// 5 MB is a sensible ceiling for a note illustration.

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024


/**
 * The allowlist maps a detected MIME type to the extension we use for the
 * server-generated storage name. We never keep the client's extension.
 */

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {

    'image/jpeg': 'jpg',

    'image/png': 'png',

    'image/webp': 'webp'

}


// The reverse lookup is used when streaming a stored image back to the UI.

export const MIME_BY_EXTENSION: Record<string, string> = {

    jpg: 'image/jpeg',

    png: 'image/png',

    webp: 'image/webp'

}
