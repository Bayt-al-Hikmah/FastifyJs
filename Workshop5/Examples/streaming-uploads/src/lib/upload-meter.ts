import { createHash, type Hash } from 'node:crypto'
import { Transform, type TransformCallback } from 'node:stream'

import { UploadLimitError } from './upload-errors.js'

// A single Transform does the work we want to demonstrate: it counts bytes,
// updates a SHA-256 hash, forwards chunks unchanged, and aborts the pipeline as
// soon as the stream crosses the limit.
export class UploadMeter extends Transform {
    private readonly maxBytes: number
    private readonly hash: Hash

    private receivedBytes = 0
    private digested = false

    constructor(maxBytes: number) {
        super()

        this.maxBytes = maxBytes
        this.hash = createHash('sha256')
    }

    get byteCount(): number {
        return this.receivedBytes
    }

    digestSha256(): string {
        if (this.digested) {
            throw new Error('The upload checksum has already been read.')
        }

        this.digested = true

        return this.hash.digest('hex')
    }

    override _transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: TransformCallback
    ): void {
        const nextSize = this.receivedBytes + chunk.length

        if (nextSize > this.maxBytes) {
            callback(
                new UploadLimitError(
                    'The stream crossed the 10 MB limit and was stopped.'
                )
            )

            return
        }

        this.receivedBytes = nextSize
        this.hash.update(chunk)

        callback(null, chunk)
    }
}
