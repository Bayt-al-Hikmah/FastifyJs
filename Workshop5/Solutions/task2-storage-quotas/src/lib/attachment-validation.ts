import { TextDecoder } from 'node:util'

import { open } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import { fileTypeFromFile } from 'file-type'

import {
    BINARY_MIME_TYPES,
    getExpectedMimeType,
    getStoredExtension,
    MAX_ORIGINAL_NAME_LENGTH
} from '../config/uploads.js'


/**
 * A route-level error with an HTTP status and a stable machine-readable code.
 * The error handler and the dashboard both rely on this shape.
 */

export class AttachmentRequestError extends Error {

    readonly statusCode: number

    readonly code: string

    constructor(
        statusCode: number,
        code: string,
        message: string
    ) {

        super(message)

        this.name = 'AttachmentRequestError'
        this.statusCode = statusCode
        this.code = code

    }

}


export type ValidatedFile = {

    mimeType: string

    extension: string

}


/**
 * Remove path components and control characters from the client filename.
 * The result is display metadata only; it never determines a storage path.
 */

export function sanitizeOriginalName(filename: string): string {

    const name = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (
        name || 'upload'
    ).slice(0, MAX_ORIGINAL_NAME_LENGTH)

}


/**
 * Validate a staged file using three independent signals:
 *
 * 1. the filename extension must be allowlisted;
 * 2. the client-declared MIME type must agree with that extension;
 * 3. the binary signature must agree with both.
 *
 * Plain text is the one format that file-type cannot identify because it has
 * no magic number. For .txt we instead reject any file that has a detectable
 * binary signature and verify that the bytes are valid UTF-8 without NULs.
 */

export async function validateStagedFile(
    stagingPath: string,
    originalName: string,
    declaredMimeType: string
): Promise<ValidatedFile> {

    const extension = extname(originalName).toLowerCase()

    const expectedMimeType = getExpectedMimeType(extension)


    if (!expectedMimeType) {

        throw new AttachmentRequestError(
            415,
            'UNSUPPORTED_FILE_TYPE',
            'Only PNG, JPEG, PDF, and TXT files are supported'
        )

    }


    const declared = declaredMimeType.trim().toLowerCase()


    if (
        declared.length > 0 &&
        !BINARY_MIME_TYPES.has(declared) &&
        declared !== expectedMimeType
    ) {

        throw new AttachmentRequestError(
            415,
            'MIME_TYPE_MISMATCH',
            'The declared MIME type does not match the filename extension'
        )

    }


    if (extension === '.txt') {

        const detected = await fileTypeFromFile(
            stagingPath,
            {
                maxBufferSize: 64 * 1024
            }
        )


        if (detected) {

            throw new AttachmentRequestError(
                415,
                'FILE_SIGNATURE_MISMATCH',
                'The file content is not plain text'
            )

        }


        const textLike = await isUtf8TextFile(stagingPath)


        if (!textLike) {

            throw new AttachmentRequestError(
                415,
                'FILE_SIGNATURE_MISMATCH',
                'The file content is not valid UTF-8 text'
            )

        }


        return {

            mimeType: 'text/plain',

            extension: 'txt'

        }

    }


    const detected = await fileTypeFromFile(
        stagingPath,
        {
            maxBufferSize: 64 * 1024
        }
    )


    if (!detected || detected.mime !== expectedMimeType) {

        throw new AttachmentRequestError(
            415,
            'FILE_SIGNATURE_MISMATCH',
            'The file content does not match the allowed format'
        )

    }


    const storedExtension = getStoredExtension(detected.mime)


    if (!storedExtension) {

        throw new AttachmentRequestError(
            415,
            'UNSUPPORTED_FILE_TYPE',
            'The detected file format is not supported'
        )

    }


    return {

        mimeType: detected.mime,

        extension: storedExtension

    }

}


async function isUtf8TextFile(filePath: string): Promise<boolean> {

    const handle = await open(filePath, 'r')

    const decoder = new TextDecoder('utf-8', {
        fatal: true
    })

    const buffer = Buffer.alloc(64 * 1024)


    try {

        while (true) {

            const { bytesRead } = await handle.read(
                buffer,
                0,
                buffer.length,
                null
            )


            if (bytesRead === 0) {
                break
            }


            const chunk = buffer.subarray(0, bytesRead)


            // NUL bytes are a strong signal that the content is binary.
            if (chunk.includes(0)) {
                return false
            }


            // The streaming flag keeps multi-byte characters split across
            // chunk boundaries decodable.
            decoder.decode(chunk, { stream: true })

        }


        decoder.decode()

        return true

    } catch {

        return false

    } finally {

        await handle.close().catch(() => undefined)

    }

}
