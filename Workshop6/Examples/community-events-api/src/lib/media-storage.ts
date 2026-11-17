import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import {
    mkdir,
    rename,
    rm,
    unlink
} from 'node:fs/promises'

import {
    basename,
    join,
    resolve
} from 'node:path'

import {
    Transform,
    type Readable
} from 'node:stream'

import { pipeline } from 'node:stream/promises'

import { fileTypeFromFile } from 'file-type'

import { ApiError } from './api-error.js'


/**
 * Cover images live outside public/ so they cannot be reached by guessing a
 * static URL. Every path is derived from a server-generated storage name that
 * is stored in PostgreSQL; no client-supplied path is ever used.
 */
const coverDirectory = resolve(
    process.cwd(),
    'storage',
    'event-covers'
)


export const MAX_COVER_SIZE = 5 * 1024 * 1024


const mimeToExtension = new Map<string, string>([

    ['image/jpeg', 'jpg'],

    ['image/png', 'png'],

    ['image/webp', 'webp']

])


const storageNamePattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/


const MAX_ORIGINAL_NAME_LENGTH = 180


export type StoredCover = {

    storageName: string

    mimeType: string

    sizeBytes: number

    originalName: string

}


export function sanitizeOriginalName(
    filename: string
): string {

    const cleanName = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (
        cleanName || 'cover'
    ).slice(0, MAX_ORIGINAL_NAME_LENGTH)

}


export async function ensureCoverDirectory(): Promise<void> {

    await mkdir(coverDirectory, {
        recursive: true
    })

}


/**
 * Stream an uploaded image to a temporary file, inspect its real binary
 * signature, and (only then) move it to its final private storage name.
 * Any failure removes both the temporary and the final file.
 */
export async function saveCoverImage(
    stream: Readable,
    originalName: string
): Promise<StoredCover> {

    await ensureCoverDirectory()

    const temporaryName = `${randomUUID()}.tmp`

    const temporaryPath = join(
        coverDirectory,
        temporaryName
    )

    let finalPath: string | null = null

    let sizeBytes = 0

    const byteCounter = new Transform({

        transform(chunk: Buffer, _encoding, callback) {

            sizeBytes += chunk.length

            callback(null, chunk)

        }

    })


    try {

        await pipeline(
            stream,
            byteCounter,
            createWriteStream(temporaryPath, {
                flags: 'wx'
            })
        )


        if (sizeBytes === 0) {

            throw ApiError.badRequest(
                'Select an image to upload.'
            )

        }


        if (sizeBytes > MAX_COVER_SIZE) {

            throw ApiError.payloadTooLarge(
                'Cover images must be 5 MB or smaller.'
            )

        }


        const detectedType = await fileTypeFromFile(
            temporaryPath
        )

        const extension = detectedType
            ? mimeToExtension.get(detectedType.mime)
            : undefined


        if (!detectedType || !extension) {

            throw ApiError.unsupportedMediaType(
                'Only JPEG, PNG, and WebP images are supported.'
            )

        }


        const storageName = `${randomUUID()}.${extension}`

        finalPath = join(
            coverDirectory,
            storageName
        )

        await rename(temporaryPath, finalPath)


        return {

            storageName,

            mimeType: detectedType.mime,

            sizeBytes,

            originalName: sanitizeOriginalName(originalName)

        }

    } catch (error) {

        await rm(temporaryPath, {
            force: true
        }).catch(() => undefined)


        if (finalPath) {

            await rm(finalPath, {
                force: true
            }).catch(() => undefined)

        }

        throw error

    }

}


/**
 * Validate a database-derived storage name before turning it into a path.
 * This is a final guard against path traversal if a row is ever corrupted.
 */
export function coverPathFor(
    storageName: string
): string {

    if (!storageNamePattern.test(storageName)) {
        throw ApiError.notFound(
            'The cover image is unavailable.'
        )
    }

    return join(coverDirectory, storageName)

}


export async function deleteCoverFile(
    storageName: string
): Promise<void> {

    const filePath = coverPathFor(storageName)

    try {

        await unlink(filePath)

    } catch (error) {

        if (
            (error as NodeJS.ErrnoException).code !== 'ENOENT'
        ) {
            throw error
        }

    }

}
