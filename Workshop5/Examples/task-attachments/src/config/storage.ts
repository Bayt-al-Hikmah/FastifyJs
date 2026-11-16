import { join, resolve } from 'node:path'


/**
 * Private storage lives outside public/. Nothing below this root is ever
 * served by @fastify/static.
 */

export const UPLOAD_ROOT = resolve(
    process.env.UPLOAD_DIR ?? './var/uploads'
)

export const STAGING_DIR = join(
    UPLOAD_ROOT,
    'staging'
)

export const OBJECTS_DIR = join(
    UPLOAD_ROOT,
    'objects'
)


/**
 * randomUUID() from node:crypto always produces a v4 UUID. Validating this
 * format before building a filesystem path keeps database values from ever
 * becoming path traversal input, even if a row is modified out-of-band.
 */

export const STORAGE_KEY_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
