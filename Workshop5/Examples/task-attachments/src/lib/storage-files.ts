import { chmod, mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import type { Readable } from 'node:stream'

import {
    OBJECTS_DIR,
    STAGING_DIR
} from '../config/storage.js'


/**
 * Create the private storage tree with restrictive permissions. The
 * directories are intentionally outside public/ so they can never be served
 * without an authorization check.
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


export function stagingPathFor(storageKey: string): string {

    return join(
        STAGING_DIR,
        `${storageKey}.part`
    )

}


export function objectPathFor(storageKey: string): string {

    return join(
        OBJECTS_DIR,
        storageKey
    )

}


export async function removeFileQuietly(
    filePath: string
): Promise<void> {

    await unlink(filePath).catch(() => undefined)

}


/**
 * Consume a stream that we are not going to store. Draining every remaining
 * part is important: the multipart iterator cannot advance to the next part
 * until the current file stream has been read.
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


export async function removeFilesQuietly(
    filePaths: Iterable<string>
): Promise<void> {

    await Promise.all(
        Array.from(filePaths, (filePath) => removeFileQuietly(filePath))
    )

}
