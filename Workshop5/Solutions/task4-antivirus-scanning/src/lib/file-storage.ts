import { basename, join } from 'node:path'

import { mkdir, unlink } from 'node:fs/promises'

import {
    OBJECTS_DIR,
    QUARANTINE_DIR,
    STAGING_DIR
} from '../config/scans.js'


export async function ensureScanStorageDirectories(): Promise<void> {

    for (const directory of [
        STAGING_DIR,
        QUARANTINE_DIR,
        OBJECTS_DIR
    ]) {

        await mkdir(directory, {
            recursive: true,
            mode: 0o700
        })

    }

}


export function quarantinePathFor(storageKey: string): string {

    return join(QUARANTINE_DIR, storageKey)

}


export function objectPathFor(storageKey: string): string {

    return join(OBJECTS_DIR, storageKey)

}


export async function removeFileQuietly(filePath: string): Promise<void> {

    await unlink(filePath).catch(() => {})

}


export function sanitizeOriginalName(filename: string): string {

    const name = basename(
        filename.replaceAll('\\', '/')
    )
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()

    return (name || 'attachment').slice(0, 255)

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
