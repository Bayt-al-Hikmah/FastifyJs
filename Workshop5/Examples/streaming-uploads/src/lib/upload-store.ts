import { randomUUID } from 'node:crypto'

export type UploadRecord = {
    id: string
    originalName: string
    storageKey: string
    mimeType: string
    extension: string
    size: number
    sha256: string
    createdAt: Date
}

export type UploadApi = {
    id: string
    originalName: string
    mimeType: string
    extension: string
    size: number
    sha256: string
    createdAt: string
    downloadUrl: string
}

export type UploadView = UploadApi & {
    displaySize: string
    displayDate: string
    shortSha256: string
    typeLabel: string
    typeClass: string
}

const records = new Map<string, UploadRecord>()

const dateFormatter = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
})

const TYPE_LABELS: Record<string, string> = {
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'application/pdf': 'PDF',
    'text/plain': 'TXT'
}

const TYPE_CLASSES: Record<string, string> = {
    'image/png': 'type-image',
    'image/jpeg': 'type-image',
    'application/pdf': 'type-pdf',
    'text/plain': 'type-text'
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function createUploadRecord(input: {
    originalName: string
    storageKey: string
    mimeType: string
    extension: string
    size: number
    sha256: string
}): UploadRecord {
    const record: UploadRecord = {
        id: randomUUID(),
        originalName: input.originalName,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        extension: input.extension,
        size: input.size,
        sha256: input.sha256,
        createdAt: new Date()
    }

    records.set(record.id, record)

    return record
}

export function findUpload(id: string): UploadRecord | undefined {
    return records.get(id)
}

export function removeUpload(id: string): UploadRecord | undefined {
    const record = records.get(id)

    if (record) {
        records.delete(id)
    }

    return record
}

export function listUploads(): UploadRecord[] {
    return [...records.values()].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
    )
}

export function toUploadApi(record: UploadRecord): UploadApi {
    return {
        id: record.id,
        originalName: record.originalName,
        mimeType: record.mimeType,
        extension: record.extension,
        size: record.size,
        sha256: record.sha256,
        createdAt: record.createdAt.toISOString(),
        downloadUrl: `/api/uploads/${record.id}/download`
    }
}

export function toUploadView(record: UploadRecord): UploadView {
    return {
        ...toUploadApi(record),
        displaySize: formatBytes(record.size),
        displayDate: dateFormatter.format(record.createdAt),
        shortSha256: `${record.sha256.slice(0, 12)}…${record.sha256.slice(-6)}`,
        typeLabel: TYPE_LABELS[record.mimeType] ?? 'FILE',
        typeClass: TYPE_CLASSES[record.mimeType] ?? 'type-other'
    }
}

export function getUploadStats(): {
    count: number
    totalBytes: number
    totalSize: string
} {
    const uploads = listUploads()

    const totalBytes = uploads.reduce(
        (total, upload) => total + upload.size,
        0
    )

    return {
        count: uploads.length,
        totalBytes,
        totalSize: formatBytes(totalBytes)
    }
}
