/**
 * One upload policy shared by the multipart plugin, the validation helper,
 * and the dashboard copy. Keeping the limits here prevents them from drifting.
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export const SUPPORTED_IMAGE_DESCRIPTION = 'JPEG, PNG, or WebP'

/**
 * The declared MIME type is only an early filter. The real check inspects the
 * binary signature with file-type after the file has been staged on disk.
 */
export const IMAGE_EXTENSIONS_BY_MIME = new Map<string, string>([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp']
])

export const IMAGE_MIMES_BY_EXTENSION = new Map<string, string>([
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp']
])

export const BINARY_MIME_TYPES = new Set([
    'application/octet-stream',
    'binary/octet-stream'
])

export function getStoredExtension(mimeType: string): string | undefined {

    return IMAGE_EXTENSIONS_BY_MIME.get(mimeType)

}
