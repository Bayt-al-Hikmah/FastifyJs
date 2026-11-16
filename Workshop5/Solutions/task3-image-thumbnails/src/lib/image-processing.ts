import sharp from 'sharp'

import { mkdir, unlink } from 'node:fs/promises'

import { basename } from 'node:path'

import {
    IMAGE_PROCESSING_TIMEOUT_MS,
    MAX_INPUT_PIXELS,
    ORIGINALS_DIR,
    SHARP_CONCURRENCY,
    STAGING_DIR,
    THUMBNAIL_MAX_WIDTH,
    THUMBNAILS_DIR
} from '../config/uploads.js'


// sharp maintains a small worker pool. Limiting it keeps thumbnail generation
// predictable on a development machine or a small container.

sharp.concurrency(SHARP_CONCURRENCY)


const sharpInputOptions = {

    failOn: 'error' as const,

    limitInputPixels: MAX_INPUT_PIXELS,

    sequentialRead: true

}


export class ImageProcessingError extends Error {

    constructor(message: string) {
        super(message)
        this.name = 'ImageProcessingError'
    }

}


export async function ensureStorageDirectories(): Promise<void> {

    for (const directory of [
        STAGING_DIR,
        ORIGINALS_DIR,
        THUMBNAILS_DIR
    ]) {

        await mkdir(directory, {
            recursive: true,
            mode: 0o700
        })

    }

}


export function sanitizeOriginalName(filename: string): string {

    const name = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (name || 'image').slice(0, 255)

}


function withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number
): Promise<T> {

    return new Promise<T>((resolve, reject) => {

        const timer = setTimeout(() => {

            reject(new Error('Image processing timed out'))

        }, timeoutMs)

        operation.then(
            (result) => {

                clearTimeout(timer)

                resolve(result)

            },
            (error: unknown) => {

                clearTimeout(timer)

                reject(error)

            }
        )

    })

}


export async function createThumbnail(
    sourcePath: string,
    destinationPath: string,
    mimeType: string
): Promise<void> {

    try {

        // Inspect the decoded dimensions before attempting a resize. The
        // pixel limit is also enforced by sharp, but this gives us a clear
        // rejection without allocating a full pipeline for oversized images.

        const metadata = await sharp(
            sourcePath,
            sharpInputOptions
        ).metadata()

        if (
            !metadata.width ||
            !metadata.height ||
            metadata.format === undefined
        ) {

            throw new ImageProcessingError('The image could not be decoded')

        }

        if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {

            throw new ImageProcessingError(
                'The image exceeds the maximum pixel limit'
            )

        }

        if (
            metadata.format !== 'jpeg' &&
            metadata.format !== 'png'
        ) {

            throw new ImageProcessingError(
                'Only JPEG and PNG images can be thumbnailed'
            )

        }

        const pipeline = sharp(sourcePath, sharpInputOptions)
            .rotate()
            .resize({
                width: THUMBNAIL_MAX_WIDTH,
                withoutEnlargement: true,
                fit: 'inside'
            })

        if (mimeType === 'image/jpeg') {

            pipeline.jpeg({
                quality: 82,
                mozjpeg: true,
                chromaSubsampling: '4:2:0'
            })

        } else {

            // Re-encoding strips ancillary metadata (EXIF, XMP, comments).
            // The palette keeps thumbnails small while preserving alpha.

            pipeline.png({
                compressionLevel: 9,
                palette: true,
                quality: 90
            })

        }

        await withTimeout(
            pipeline.toFile(destinationPath),
            IMAGE_PROCESSING_TIMEOUT_MS
        )

    } catch (error) {

        if (error instanceof ImageProcessingError) {
            throw error
        }

        throw new ImageProcessingError(
            error instanceof Error
                ? error.message
                : 'Thumbnail generation failed'
        )

    }

}


export async function removeFileQuietly(filePath: string): Promise<void> {

    await unlink(filePath).catch(() => {})

}


export function contentDisposition(
    disposition: 'attachment' | 'inline',
    filename: string
): string {

    const fallback = filename
        .replace(/[^\x20-\x7E]/g, '_')
        .replaceAll('"', '_')
        .replaceAll('\\', '_')

    const encoded = encodeURIComponent(filename)

    return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`

}
