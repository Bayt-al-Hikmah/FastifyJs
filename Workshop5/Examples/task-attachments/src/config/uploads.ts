/**
 * Central upload policy for the attachment API.
 *
 * The same constants are used by the multipart plugin, the route handlers,
 * and the dashboard copy so that the documented limits cannot drift.
 */

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

export const MAX_FILES_PER_REQUEST = 5

export const MAX_ORIGINAL_NAME_LENGTH = 255


/**
 * The extension allowlist maps a client-supplied extension to the one MIME
 * type that the file content must actually have.
 */

const extensionPolicy = {

    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain'

} as const satisfies Record<string, string>


/**
 * Once a file passes validation we store a server-controlled extension
 * derived from the detected MIME type, not from the original filename.
 */

const mimePolicy = {

    'image/jpeg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf',
    'text/plain': 'txt'

} as const satisfies Record<string, string>


export const ALLOWED_FIELD_NAMES = new Set([
    'file',
    'files'
])


export const BINARY_MIME_TYPES = new Set([
    'application/octet-stream',
    'binary/octet-stream'
])


export function getExpectedMimeType(
    extension: string
): string | undefined {

    return (
        extensionPolicy as Record<string, string>
    )[extension]

}


export function getStoredExtension(
    mimeType: string
): string | undefined {

    return (
        mimePolicy as Record<string, string>
    )[mimeType]

}


export function getSupportedDescription(): string {

    return 'PNG, JPEG, PDF, or TXT'

}
