import 'dotenv/config'
import { S3Client } from '@aws-sdk/client-s3'

export const S3_BUCKET = process.env.S3_BUCKET ?? 'task-attachments-private'

export const S3_REGION = process.env.S3_REGION ?? 'us-east-1'

export const S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9000'

export const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE !== 'false'

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10 MB

export const PRESIGNED_UPLOAD_EXPIRY_SECONDS = 300 // 5 minutes

export const PRESIGNED_DOWNLOAD_EXPIRY_SECONDS = 60 // 1 minute

export const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: S3_FORCE_PATH_STYLE,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin'
    }
})
