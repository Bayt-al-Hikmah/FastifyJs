import { randomUUID } from 'node:crypto'

import {
    chmod,
    mkdir,
    open,
    rename,
    stat,
    unlink
} from 'node:fs/promises'

import {
    basename,
    extname,
    join
} from 'node:path'

import { pipeline } from 'node:stream/promises'

import type { Readable } from 'node:stream'

import { fileTypeFromFile } from 'file-type'

import {
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE,
    UPLOAD_DIR
} from '../config.js'

import { ApiError } from './api-error.js'

import type { StoredImage } from '../types/note.js'


/**
 * A storage name is always a UUID v4 followed by an extension we chose from
 * the signature check. Validating it before every filesystem operation stops
 * a value from ever being used for path traversal.
 */

const STORAGE_NAME_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i


// Client extensions are only a hint. The real decision comes from file-type.

const EXTENSION_MIME: Record<string, string> = {

    jpg: 'image/jpeg',

    jpeg: 'image/jpeg',

    png: 'image/png',

    webp: 'image/webp'

}


/**
 * Create the private storage directory with restrictive permissions. Images
 * live outside public/ so they cannot be served without an API check.
 */

export async function ensureUploadDirectories(): Promise<void> {

    await mkdir(UPLOAD_DIR, {

        recursive: true,

        mode: 0o700

    })

    await chmod(UPLOAD_DIR, 0o700)

}


export function isValidStorageName(
    storageName: string
): boolean {

    return STORAGE_NAME_PATTERN.test(storageName)

}


export function imagePathFor(
    storageName: string
): string {

    if (!isValidStorageName(storageName)) {
        throw new Error('Invalid internal image storage name')
    }

    return join(UPLOAD_DIR, storageName)

}


/**
 * Strip directories and control characters from a client filename. We keep
 * this only for display metadata; the physical filename is server-generated.
 */

function sanitizeOriginalName(
    filename: string
): string {

    const name = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (name || 'image').slice(0, 255)

}


/**
 * Consume a stream we are not going to store. Multipart parsing cannot move
 * to the next part until the current stream has been read to the end.
 */

export async function drainFileStream(
    stream: Readable
): Promise<void> {

    try {

        for await (const _chunk of stream) {

            // Discard the chunk.

        }

    } catch {

        // A truncated or aborted stream has nothing left to drain.

    }

}


export type StoreImageOptions = {
    fieldName: string
    originalFilename: string
    declaredMimeType: string
    stream: Readable
    truncated: boolean
}


/**
 * Stream an uploaded image to private storage. Every check happens on the
 * bytes actually received, never on the filename or the client MIME type.
 */

export async function storeImage(
    options: StoreImageOptions
): Promise<StoredImage> {

    const {
        fieldName,
        originalFilename,
        declaredMimeType,
        stream,
        truncated
    } = options


    if (fieldName !== 'image') {

        await drainFileStream(stream)

        throw new ApiError(
            'The file field must be named "image".',
            400
        )

    }


    const originalName = sanitizeOriginalName(
        originalFilename
    )

    const extension = extname(
        originalName
    )
        .toLowerCase()
        .slice(1)

    const expectedMime = EXTENSION_MIME[extension]


    if (!expectedMime) {

        await drainFileStream(stream)

        throw new ApiError(
            'Only JPEG, PNG, and WebP images are supported.',
            415
        )

    }


    const serverExtension = ALLOWED_IMAGE_TYPES[expectedMime]

    const storageName = `${randomUUID()}.${serverExtension}`

    const stagingPath = join(
        UPLOAD_DIR,
        `${storageName}.part`
    )

    const finalPath = join(
        UPLOAD_DIR,
        storageName
    )


    let stagingFileCreated = false


    try {

        const handle = await open(
            stagingPath,
            'wx',
            0o600
        )

        stagingFileCreated = true


        await pipeline(
            stream,
            handle.createWriteStream({
                autoClose: true
            })
        )


        if (truncated) {
            throw new ApiError(
                'The image exceeds the maximum allowed size.',
                413
            )
        }


        const stats = await stat(stagingPath)


        if (stats.size === 0) {
            throw new ApiError(
                'Empty files are not allowed.',
                400
            )
        }


        if (stats.size > MAX_IMAGE_SIZE) {
            throw new ApiError(
                'The image exceeds the maximum allowed size.',
                413
            )
        }


        const detected = await fileTypeFromFile(
            stagingPath,
            {
                maxBufferSize: 64 * 1024
            }
        )


        if (!detected || detected.mime !== expectedMime) {
            throw new ApiError(
                'The file content does not match its extension.',
                415
            )
        }


        if (
            declaredMimeType !== 'application/octet-stream' &&
            declaredMimeType !== detected.mime
        ) {
            throw new ApiError(
                'The declared content type does not match the file content.',
                415
            )
        }


        await rename(
            stagingPath,
            finalPath
        )

        stagingFileCreated = false


        return {

            storageName,

            originalName,

            mimeType: detected.mime,

            size: stats.size

        }

    } finally {

        if (stagingFileCreated) {
            await unlink(stagingPath).catch(() => undefined)
        }

    }

}


export async function removeImage(
    storageName: string | null
): Promise<void> {

    if (!storageName) {
        return
    }

    if (!isValidStorageName(storageName)) {
        return
    }

    await unlink(
        join(UPLOAD_DIR, storageName)
    ).catch(() => undefined)

}
