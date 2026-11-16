import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import {
    mkdir,
    rename,
    rm,
    stat,
    unlink
} from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { fileTypeFromFile } from "file-type";

import { env } from "../config/env.js";

const allowedTypes = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"]
]);

export class UnsupportedCoverTypeError extends Error {
    constructor() {
        super("Only JPEG, PNG, and WebP images are accepted.");

        this.name = "UnsupportedCoverTypeError";
    }
}

export type StoredCover = {
    storageName: string;
    mimeType: string;
    sizeBytes: number;
    filePath: string;
};

export async function saveUploadedCover(
    fileStream: Readable
): Promise<StoredCover> {
    await mkdir(env.storageDirectory, { recursive: true });

    const temporaryName = `${randomUUID()}.tmp`;
    const temporaryPath = path.join(env.storageDirectory, temporaryName);

    let finalPath: string | null = null;

    try {
        await pipeline(
            fileStream,
            createWriteStream(temporaryPath, {
                flags: "wx"
            })
        );

        const detectedType = await fileTypeFromFile(temporaryPath);
        const extension = allowedTypes.get(detectedType?.mime ?? "");

        if (!detectedType || !extension) {
            throw new UnsupportedCoverTypeError();
        }

        const storageName = `${randomUUID()}.${extension}`;

        finalPath = path.join(env.storageDirectory, storageName);

        await rename(temporaryPath, finalPath);

        const fileStats = await stat(finalPath);

        return {
            storageName,
            mimeType: detectedType.mime,
            sizeBytes: fileStats.size,
            filePath: finalPath
        };
    } catch (error) {
        await rm(temporaryPath, { force: true });

        if (finalPath) {
            await rm(finalPath, { force: true });
        }

        throw error;
    }
}

export function resolveCoverPath(storageName: string): string {
    const safeName = path.basename(storageName);

    if (safeName !== storageName) {
        throw new Error("INVALID_STORAGE_NAME");
    }

    return path.join(env.storageDirectory, safeName);
}

export async function deleteStoredCover(
    storageName: string
): Promise<void> {
    const filePath = resolveCoverPath(storageName);

    try {
        await unlink(filePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    }
}

export async function coverFileExists(
    storageName: string
): Promise<boolean> {
    try {
        await stat(resolveCoverPath(storageName));

        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return false;
        }

        throw error;
    }
}
