import { join, resolve } from 'node:path'

/**
 * Private storage lives outside public/. Nothing under this root is served by
 * @fastify/static, so every byte must pass through an authenticated route.
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
 * randomUUID() always produces a v4 UUID. Checking that format before joining
 * a path keeps a database value from ever becoming traversal input, even if a
 * row is modified out of band.
 */
export const STORAGE_KEY_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
