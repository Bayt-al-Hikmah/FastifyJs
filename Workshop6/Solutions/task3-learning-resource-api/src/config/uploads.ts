/**
 * Upload policy shared by the multipart plugin, the validation helpers, and
 * the dashboard copy. Five megabytes is enough for lecture hand-outs while
 * keeping untrusted payloads small.
 */

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024

export const MAX_FILES_PER_REQUEST = 1

export const MAX_ORIGINAL_NAME_LENGTH = 255


export const SUPPORTED_IMAGE_DESCRIPTION = 'JPG, PNG, or WEBP up to 5 MB'
