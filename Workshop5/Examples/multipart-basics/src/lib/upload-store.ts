import { randomUUID } from 'node:crypto'

export type StoredFileRecord = {
    id: string
    originalName: string
    storageKey: string
    mimeType: string
    extension: string
    size: number
    createdAt: Date
}

export type StoredFileView = StoredFileRecord & {
    typeLabel: string
    typeClass: string
    displaySize: string
    displayDate: string
    downloadUrl: string
}

const records = new Map<string, StoredFileRecord>()

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

export function createFileRecord(input: {
    originalName: string
    storageKey: string
    mimeType: string
    extension: string
    size: number
}): StoredFileRecord {
    const record: StoredFileRecord = {
        id: randomUUID(),
        originalName: input.originalName,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        extension: input.extension,
        size: input.size,
        createdAt: new Date()
    }

    records.set(record.id, record)

    return record
}

export function findFile(id: string): StoredFileRecord | undefined {
    return records.get(id)
}

export function removeFile(id: string): StoredFileRecord | undefined {
    const record = records.get(id)

    if (record) {
        records.delete(id)
    }

    return record
}

export function listFiles(): StoredFileRecord[] {
    return [...records.values()].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
    )
}

export function toFileView(record: StoredFileRecord): StoredFileView {
    return {
        ...record,
        typeLabel: TYPE_LABELS[record.mimeType] ?? 'FILE',
        typeClass: TYPE_CLASSES[record.mimeType] ?? 'type-other',
        displaySize: formatBytes(record.size),
        displayDate: dateFormatter.format(record.createdAt),
        downloadUrl: `/files/${record.id}/download`
    }
}

export function getUploadStats(): {
    count: number
    totalSize: string
} {
    const files = listFiles()

    const totalBytes = files.reduce(
        (total, file) => total + file.size,
        0
    )

    return {
        count: files.length,
        totalSize: formatBytes(totalBytes)
    }
}
