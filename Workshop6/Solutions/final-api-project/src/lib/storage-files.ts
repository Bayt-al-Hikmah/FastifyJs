import { chmod, mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import type { Readable } from 'node:stream'

import {
    OBJECTS_DIR,
    STAGING_DIR,
    STORAGE_KEY_PATTERN
} from '../config/storage.js'


/**
 * Create the private storage tree with restrictive permissions. It runs in
 * the onReady hook so a missing directory cannot break module import.
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


export function isValidStorageKey(storageKey: string): boolean {

    return STORAGE_KEY_PATTERN.test(storageKey)

}


export async function removeFileQuietly(
    filePath: string
): Promise<void> {

    await unlink(filePath).catch(() => undefined)

}


/**
 * Remove a stored object referenced by the database. The key is validated
 * first so a corrupted row can never influence the filesystem path.
 */

export async function removeStoredObject(
    storageKey: string
): Promise<void> {

    if (!isValidStorageKey(storageKey)) {
        return
    }

    await removeFileQuietly(objectPathFor(storageKey))

}


/**
 * Drain a multipart stream we are discarding. The iterator cannot advance to
 * the next part until the current file stream has been consumed.
 */

export async function drainFileStream(
    stream: Readable
): Promise<void> {

    try {

        for await (const _chunk of stream) {

            // Discard the chunk.

        }

    } catch {

        // A truncated stream has nothing left to drain.

    }

}
