import { randomUUID } from 'node:crypto'

import { open, rename, stat } from 'node:fs/promises'

import { pipeline } from 'node:stream/promises'

import type { FastifyRequest } from 'fastify'

import { MAX_ATTACHMENT_SIZE } from '../config/uploads.js'

import { ApiError } from './api-error.js'

import {
    sanitizeOriginalName,
    validateImageFile,
    type ValidatedImage
} from './media-validation.js'

import {
    drainFileStream,
    objectPathFor,
    removeFileQuietly,
    stagingPathFor
} from './storage-files.js'


export type StoredImage = ValidatedImage & {

    originalName: string

    storageKey: string

    size: number

}


/**
 * Receive one validated image from a multipart request.
 *
 * The file is streamed to a private staging file first, checked, and only
 * then renamed into the object store. The caller owns the returned storage
 * key: if its database write fails it must call removeStoredObject().
 */

export async function receiveImage(
    request: FastifyRequest
): Promise<StoredImage> {

    if (!request.isMultipart()) {

        throw new ApiError(
            415,
            'Expected multipart/form-data.'
        )

    }


    const part = await request.file({
        throwFileSizeLimit: false
    })


    if (!part) {

        throw new ApiError(
            400,
            'No photo was provided.'
        )

    }


    if (part.fieldname !== 'file') {

        await drainFileStream(part.file)

        throw new ApiError(
            400,
            'The photo must be sent in the "file" field.'
        )

    }


    const storageKey = randomUUID()

    const stagingPath = stagingPathFor(storageKey)

    const objectPath = objectPathFor(storageKey)


    let stagingFileCreated = false


    try {

        const handle = await open(
            stagingPath,
            'wx',
            0o600
        )

        stagingFileCreated = true


        await pipeline(
            part.file,
            handle.createWriteStream({
                autoClose: true
            })
        )


        if (part.file.truncated) {

            throw new ApiError(
                413,
                'The photo exceeds the 5 MB limit.'
            )

        }


        const stats = await stat(stagingPath)


        if (stats.size === 0) {

            throw new ApiError(
                400,
                'Empty photos are not allowed.'
            )

        }


        if (stats.size > MAX_ATTACHMENT_SIZE) {

            throw new ApiError(
                413,
                'The photo exceeds the 5 MB limit.'
            )

        }


        const originalName = sanitizeOriginalName(part.filename)

        const validated = await validateImageFile(
            stagingPath,
            originalName,
            part.mimetype
        )


        await rename(
            stagingPath,
            objectPath
        )

        stagingFileCreated = false


        return {

            ...validated,

            originalName,

            storageKey,

            size: Number(stats.size)

        }

    } finally {

        if (stagingFileCreated) {

            await removeFileQuietly(stagingPath)

        }

    }

}
