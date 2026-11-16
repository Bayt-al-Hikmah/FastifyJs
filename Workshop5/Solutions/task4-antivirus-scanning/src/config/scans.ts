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

export const UPLOAD_ROOT = resolve(
    process.env.UPLOAD_DIR ?? './var/uploads'
)

export const STAGING_DIR = resolve(UPLOAD_ROOT, 'staging')

export const QUARANTINE_DIR = resolve(UPLOAD_ROOT, 'quarantine')

export const OBJECTS_DIR = resolve(UPLOAD_ROOT, 'objects')


// The demo scanner is the default. Setting CLAMAV_HOST switches the
// application to a real clamd INSTREAM scan over TCP.

export const CLAMAV_HOST = process.env.CLAMAV_HOST?.trim() || null

export const CLAMAV_PORT = Math.min(
    65_535,
    parsePositiveInteger(process.env.CLAMAV_PORT, 3310)
)

export const SCANNER_TIMEOUT_MS = parsePositiveInteger(
    process.env.SCANNER_TIMEOUT_MS,
    15_000
)

export const MOCK_SCAN_DELAY_MS = parsePositiveInteger(
    process.env.MOCK_SCAN_DELAY_MS,
    500
)


// JPEG, PNG and PDF files can be identified by their binary signatures.
// Plain text is accepted only so the safe EICAR demonstration can be scanned;
// document in the README that production deployments should remove it unless
// text uploads are genuinely required.

export const ALLOWED_MIME_TYPES: Record<string, string> = {

    'image/jpeg': 'jpg',

    'image/png': 'png',

    'application/pdf': 'pdf',

    'text/plain': 'txt'

}


const EXTENSION_MIME_TYPES: Record<string, string> = {

    '.jpg': 'image/jpeg',

    '.jpeg': 'image/jpeg',

    '.png': 'image/png',

    '.pdf': 'application/pdf',

    '.txt': 'text/plain'

}


export function expectedMimeTypeForExtension(
    extension: string
): string | undefined {

    return EXTENSION_MIME_TYPES[extension.toLowerCase()]

}


export function extensionForMimeType(
    mimeType: string
): string | undefined {

    return ALLOWED_MIME_TYPES[mimeType]

}
