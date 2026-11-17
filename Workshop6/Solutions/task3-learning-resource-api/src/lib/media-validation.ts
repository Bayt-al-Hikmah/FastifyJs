import { basename, extname } from 'node:path'

import { fileTypeFromFile } from 'file-type'

import { MAX_ORIGINAL_NAME_LENGTH } from '../config/uploads.js'

import { ApiError } from './api-error.js'


/**
 * Extension -> expected MIME type. The declared type and the binary signature
 * must both agree with this value before a file is accepted.
 */

const EXTENSION_MIME_TYPES: Record<string, string> = {

    '.jpg': 'image/jpeg',

    '.jpeg': 'image/jpeg',

    '.png': 'image/png',

    '.webp': 'image/webp'

}


/**
 * The extension we write to disk is derived from the detected MIME type,
 * never from the client filename.
 */

const MIME_EXTENSIONS: Record<string, string> = {

    'image/jpeg': 'jpg',

    'image/png': 'png',

    'image/webp': 'webp'

}


const GENERIC_BINARY_MIME_TYPES = new Set([

    'application/octet-stream',

    'binary/octet-stream'

])


export type ValidatedImage = {

    mimeType: string

    extension: string

}


/**
 * Strip directories and control characters. The result is display metadata
 * only; it never determines a filesystem path.
 */

export function sanitizeOriginalName(filename: string): string {

    const name = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (
        name || 'resource-image'
    ).slice(0, MAX_ORIGINAL_NAME_LENGTH)

}


/**
 * Validate a staged file with three independent signals: a safe extension,
 * a consistent declared MIME type, and a matching binary signature. This is
 * what stops a renamed executable from being stored as a course image.
 */

export async function validateImageFile(
    stagingPath: string,
    originalName: string,
    declaredMimeType: string
): Promise<ValidatedImage> {

    const extension = extname(originalName).toLowerCase()

    const expectedMimeType = EXTENSION_MIME_TYPES[extension]


    if (!expectedMimeType) {

        throw new ApiError(
            415,
            'Only JPG, PNG, and WEBP image files are supported.'
        )

    }


    const declared = declaredMimeType.trim().toLowerCase()


    if (
        declared.length > 0 &&
        !GENERIC_BINARY_MIME_TYPES.has(declared) &&
        declared !== expectedMimeType
    ) {

        throw new ApiError(
            415,
            'The declared image type does not match the file extension.'
        )

    }


    const detected = await fileTypeFromFile(
        stagingPath,
        {
            maxBufferSize: 64 * 1024
        }
    )


    if (!detected || detected.mime !== expectedMimeType) {

        throw new ApiError(
            415,
            'The file content is not a valid image of the allowed format.'
        )

    }


    const storedExtension = MIME_EXTENSIONS[detected.mime]


    if (!storedExtension) {

        throw new ApiError(
            415,
            'The detected image format is not supported.'
        )

    }


    return {

        mimeType: detected.mime,

        extension: storedExtension

    }

}
