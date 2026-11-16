import { resolve } from 'node:path'


function parsePositiveInteger(
    value: string | undefined,
    fallback: number
): number {

    if (!value) {
        return fallback
    }

    const parsed = Number(value)

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        return fallback
    }

    return parsed

}


export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

export const THUMBNAIL_MAX_WIDTH = 300

// Refuse to decode images larger than roughly 24 megapixels. This keeps a
// single crafted image from consuming an unbounded amount of memory.

export const MAX_INPUT_PIXELS = parsePositiveInteger(
    process.env.MAX_INPUT_PIXELS,
    24_000_000
)

// A low concurrency deliberately limits how many images sharp processes at
// the same time. It is configurable, but only between one and two workers.

export const SHARP_CONCURRENCY = Math.min(
    2,
    parsePositiveInteger(process.env.SHARP_CONCURRENCY, 1)
)

export const IMAGE_PROCESSING_TIMEOUT_MS = 15_000

export const UPLOAD_ROOT = resolve(
    process.env.UPLOAD_DIR ?? './var/uploads'
)

export const STAGING_DIR = resolve(UPLOAD_ROOT, 'staging')

export const ORIGINALS_DIR = resolve(UPLOAD_ROOT, 'originals')

export const THUMBNAILS_DIR = resolve(UPLOAD_ROOT, 'thumbnails')


// Only JPEG and PNG files are accepted by this solution.

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {

    'image/jpeg': 'jpg',

    'image/png': 'png'

}


const EXTENSION_MIME_TYPES: Record<string, string> = {

    '.jpg': 'image/jpeg',

    '.jpeg': 'image/jpeg',

    '.png': 'image/png'

}


export function expectedMimeTypeForExtension(
    extension: string
): string | undefined {

    return EXTENSION_MIME_TYPES[extension.toLowerCase()]

}


export function extensionForMimeType(
    mimeType: string
): string | undefined {

    return ALLOWED_IMAGE_TYPES[mimeType]

}
