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

import type { Readable } from 'node:stream'

import { pipeline } from 'node:stream/promises'

import { fileTypeFromFile } from 'file-type'

import { ApiError } from './api-error.js'

import {
    OBJECTS_DIR,
    STAGING_DIR,
    STORAGE_KEY_PATTERN
} from '../config/storage.js'

import {
    BINARY_MIME_TYPES,
    getStoredExtension,
    IMAGE_MIMES_BY_EXTENSION,
    MAX_IMAGE_SIZE,
    SUPPORTED_IMAGE_DESCRIPTION
} from '../config/uploads.js'


/**
 * The small structural subset of a multipart file part that this helper
 * needs. request.file() from @fastify/multipart satisfies it.
 */
export type UploadPart = {

    filename: string

    mimetype: string

    file: Readable & {

        truncated?: boolean

    }

}


export type StoredImage = {

    storageKey: string

    objectPath: string

    originalName: string

    mimeType: string

    extension: string

    size: number

}


/**
 * Create the private storage tree with restrictive permissions. The route
 * server calls this once before it starts accepting requests.
 */
export async function ensureStorageDirectories(): Promise<void> {

    await mkdir(STAGING_DIR, {
        recursive: true,
        mode: 0o700
    })

    await mkdir(OBJECTS_DIR, {
        recursive: true,
        mode: 0o700
    })

    await chmod(STAGING_DIR, 0o700)

    await chmod(OBJECTS_DIR, 0o700)

}


/**
 * Remove path components and control characters from a client filename.
 * The result is display metadata only; it never determines a storage path.
 */
function sanitizeOriginalName(filename: string): string {

    const cleaned = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (cleaned || 'image').slice(0, 255)

}


/**
 * Stream a multipart file into staging, verify its signature, then move it
 * into private object storage under a server-generated UUID. Every failure
 * path removes the temporary bytes and any partially stored object.
 */
export async function receiveImage(part: UploadPart): Promise<StoredImage> {

    const storageKey = randomUUID()

    const stagingPath = join(
        STAGING_DIR,
        `${storageKey}.part`
    )

    const objectPath = join(
        OBJECTS_DIR,
        storageKey
    )


    let stagingCreated = false

    let objectCreated = false


    try {

        const handle = await open(
            stagingPath,
            'wx',
            0o600
        )

        stagingCreated = true


        await pipeline(
            part.file,
            handle.createWriteStream({
                autoClose: true
            })
        )


        if (part.file.truncated) {

            throw new ApiError(
                413,
                'The image is larger than the 5 MB upload limit.'
            )

        }


        const fileStats = await stat(stagingPath)


        if (fileStats.size === 0) {

            throw new ApiError(
                400,
                'The uploaded file is empty.'
            )

        }


        if (fileStats.size > MAX_IMAGE_SIZE) {

            throw new ApiError(
                413,
                'The image is larger than the 5 MB upload limit.'
            )

        }


        const originalName = sanitizeOriginalName(
            part.filename
        )


        const declaredMimeType = part.mimetype
            .trim()
            .toLowerCase()


        const detected = await fileTypeFromFile(
            stagingPath,
            {
                maxBufferSize: 64 * 1024
            }
        )


        const storedExtension = detected
            ? getStoredExtension(detected.mime)
            : undefined


        if (!detected || !storedExtension) {

            throw new ApiError(
                415,
                `Only ${SUPPORTED_IMAGE_DESCRIPTION} images are supported.`
            )

        }


        if (
            declaredMimeType.length > 0 &&
            !BINARY_MIME_TYPES.has(declaredMimeType) &&
            declaredMimeType !== detected.mime
        ) {

            throw new ApiError(
                415,
                'The declared MIME type does not match the image content.'
            )

        }


        const extensionFromName = extname(
            originalName
        ).toLowerCase()

        const expectedMimeType = IMAGE_MIMES_BY_EXTENSION.get(
            extensionFromName
        )


        if (expectedMimeType && expectedMimeType !== detected.mime) {

            throw new ApiError(
                415,
                'The file extension does not match the image content.'
            )

        }


        await rename(
            stagingPath,
            objectPath
        )

        stagingCreated = false

        objectCreated = true


        return {

            storageKey,

            objectPath,

            originalName,

            mimeType: detected.mime,

            extension: storedExtension,

            size: Number(fileStats.size)

        }

    } catch (error) {

        if (stagingCreated) {

            await unlink(stagingPath).catch(() => undefined)

        }


        if (objectCreated) {

            await unlink(objectPath).catch(() => undefined)

        }


        throw error

    }

}


/**
 * Drain a multipart stream we are not going to keep. The iterator cannot
 * advance to the next part until the current file stream is consumed.
 */
export async function drainFileStream(stream: Readable): Promise<void> {

    try {

        for await (const _chunk of stream) {

            // Discard the chunk.

        }

    } catch {

        // A truncated or aborted stream has nothing left to drain.

    }

}


/**
 * Delete a stored object using only a UUID read back from PostgreSQL. The
 * pattern check prevents a corrupted row from escaping the storage root.
 */
export async function deleteImageObject(
    storageKey: string
): Promise<void> {

    if (!STORAGE_KEY_PATTERN.test(storageKey)) {

        throw new ApiError(
            500,
            'A stored image could not be resolved safely.'
        )

    }


    try {

        await unlink(
            join(OBJECTS_DIR, storageKey)
        )

    } catch (error) {

        const code = (
            error as NodeJS.ErrnoException
        ).code


        if (code !== 'ENOENT') {
            throw error
        }

    }

}
