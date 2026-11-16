import { join, resolve } from 'node:path'

// The public limit shown to users. The multipart plugin enforces the same value.
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

export const MAX_UPLOAD_LABEL = '2 MB'

export const UPLOAD_ROOT = resolve(
    process.env.UPLOAD_DIR ?? './var/uploads'
)

export const STAGING_DIR = join(UPLOAD_ROOT, 'staging')

export const OBJECTS_DIR = join(UPLOAD_ROOT, 'objects')

// Client-visible extensions mapped to the MIME type we expect on disk.
export const ALLOWED_EXTENSIONS: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain'
}

// The extension written into metadata comes from detection, not the client name.
export const EXTENSION_BY_MIME: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'application/pdf': 'pdf',
    'text/plain': 'txt'
}

export const ALLOWED_TYPE_LABELS = [
    'PNG images',
    'JPEG images',
    'PDF documents',
    'Plain text files'
]
