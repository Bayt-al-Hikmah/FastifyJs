import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import { fileTypeFromFile } from 'file-type'

import {
    ALLOWED_EXTENSIONS,
    EXTENSION_BY_MIME
} from '../config/uploads.js'

import { UploadRejection } from './upload-errors.js'

export type ValidatedFile = {
    mimeType: string
    extension: string
}

export function sanitizeOriginalName(filename: string): string {
    const normalized = filename.replaceAll('\\', '/')

    const name = basename(normalized)
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (name || 'upload').slice(0, 255)
}

export function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value
    )
}

export function buildContentDisposition(
    originalName: string,
    fallbackName: string
): string {
    const fallback = fallbackName.replace(/[^A-Za-z0-9._-]/g, '_')

    const encoded = encodeURIComponent(sanitizeOriginalName(originalName))

    return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

async function assertPlainText(filePath: string): Promise<void> {
    const content = await readFile(filePath)

    if (content.includes(0)) {
        throw new UploadRejection(
            'content-mismatch',
            'A text upload must not contain binary NUL bytes.',
            415
        )
    }

    try {
        new TextDecoder('utf-8', {
            fatal: true
        }).decode(content)
    } catch {
        throw new UploadRejection(
            'content-mismatch',
            'The text upload is not valid UTF-8.',
            415
        )
    }
}

export async function validateStoredFile(
    stagingPath: string,
    originalName: string,
    declaredMime: string
): Promise<ValidatedFile> {
    const extension = extname(originalName).toLowerCase()
    const expectedMime = ALLOWED_EXTENSIONS[extension]

    if (!expectedMime) {
        throw new UploadRejection(
            'unsupported-type',
            'Only PNG, JPEG, PDF, and TXT files are accepted.',
            415
        )
    }

    const detected = await fileTypeFromFile(stagingPath)

    if (extension === '.txt') {
        if (detected) {
            throw new UploadRejection(
                'content-mismatch',
                'The file has a binary signature but claims to be text.',
                415
            )
        }

        await assertPlainText(stagingPath)

        if (
            declaredMime !== 'application/octet-stream' &&
            declaredMime !== 'text/plain'
        ) {
            throw new UploadRejection(
                'content-mismatch',
                'The declared MIME type does not match a text file.',
                415
            )
        }

        return {
            mimeType: 'text/plain',
            extension: 'txt'
        }
    }

    if (!detected || detected.mime !== expectedMime) {
        throw new UploadRejection(
            'content-mismatch',
            'The binary signature does not match the file extension.',
            415
        )
    }

    if (
        declaredMime !== 'application/octet-stream' &&
        declaredMime !== detected.mime
    ) {
        throw new UploadRejection(
            'content-mismatch',
            'The declared MIME type does not match the file signature.',
            415
        )
    }

    const detectedExtension = EXTENSION_BY_MIME[detected.mime]

    if (!detectedExtension) {
        throw new UploadRejection(
            'unsupported-type',
            'The detected format is not supported.',
            415
        )
    }

    return {
        mimeType: detected.mime,
        extension: detectedExtension
    }
}
