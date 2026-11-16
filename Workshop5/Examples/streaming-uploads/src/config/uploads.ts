import { join, resolve } from 'node:path'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const MAX_UPLOAD_LABEL = '10 MB'

// The parser gets a little headroom so our metering Transform is the component
// that rejects an oversized stream at the exact application limit.
export const MULTIPART_HARD_LIMIT = MAX_UPLOAD_BYTES + 64 * 1024

export const UPLOAD_ROOT = resolve(
    process.env.UPLOAD_DIR ?? './var/uploads'
)

export const STAGING_DIR = join(UPLOAD_ROOT, 'staging')

export const OBJECTS_DIR = join(UPLOAD_ROOT, 'objects')

export const ALLOWED_EXTENSIONS: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain'
}

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
    'Plain text'
]
