import { join, resolve } from 'node:path'


/**
 * Photo objects live outside public/ and are never served by @fastify/static.
 * Only an authenticated route can stream them back to a client.
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
 * randomUUID() produces v4 UUIDs. Checking this exact format before building
 * a path prevents a tampered database value from becoming traversal input.
 */

export const STORAGE_KEY_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
