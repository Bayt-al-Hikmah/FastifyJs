import {
    CreateBucketCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    PutObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'node:stream'
import {
    MAX_ATTACHMENT_SIZE,
    PRESIGNED_DOWNLOAD_EXPIRY_SECONDS,
    PRESIGNED_UPLOAD_EXPIRY_SECONDS,
    S3_BUCKET,
    s3Client
} from '../config/s3.js'

export async function ensureBucketExists(): Promise<void> {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }))
    } catch {
        try {
            await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }))
        } catch (createErr) {
            // Bucket may already exist or fail on permissions
            console.warn('Bucket initialization notice:', (createErr as Error).message)
        }
    }
}

export async function createPresignedUploadUrl(
    storageKey: string,
    mimeType: string
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: storageKey,
        ContentType: mimeType
    })

    return getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_UPLOAD_EXPIRY_SECONDS
    })
}

export async function createPresignedDownloadUrl(
    storageKey: string,
    originalName: string
): Promise<string> {
    const sanitizedName = originalName.replace(/["\r\n\\]/g, '_')
    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: storageKey,
        ResponseContentDisposition: `attachment; filename="${sanitizedName}"`
    })

    return getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_DOWNLOAD_EXPIRY_SECONDS
    })
}

export type VerifiedS3Object = {
    size: number
    mimeType: string
}

export async function verifyS3Object(storageKey: string): Promise<VerifiedS3Object | null> {
    try {
        const head = await s3Client.send(
            new HeadObjectCommand({
                Bucket: S3_BUCKET,
                Key: storageKey
            })
        )

        const size = head.ContentLength ?? 0
        const mimeType = head.ContentType ?? 'application/octet-stream'

        if (size <= 0 || size > MAX_ATTACHMENT_SIZE) {
            return null
        }

        return { size, mimeType }
    } catch {
        return null
    }
}

export async function deleteS3Object(storageKey: string): Promise<void> {
    try {
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: S3_BUCKET,
                Key: storageKey
            })
        )
    } catch (err) {
        console.warn('Failed to delete S3 object:', (err as Error).message)
    }
}

export async function getS3ObjectStream(storageKey: string): Promise<{
    stream: Readable
    contentType: string
    contentLength: number
} | null> {
    try {
        const output = await s3Client.send(
            new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: storageKey
            })
        )

        if (!output.Body || !(output.Body instanceof Readable)) {
            return null
        }

        return {
            stream: output.Body as Readable,
            contentType: output.ContentType ?? 'application/octet-stream',
            contentLength: output.ContentLength ?? 0
        }
    } catch {
        return null
    }
}
