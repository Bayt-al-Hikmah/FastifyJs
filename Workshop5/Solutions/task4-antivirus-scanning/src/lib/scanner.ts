import { createReadStream } from 'node:fs'

import { readFile } from 'node:fs/promises'

import { createConnection, type Socket } from 'node:net'

import {
    CLAMAV_HOST,
    CLAMAV_PORT,
    MOCK_SCAN_DELAY_MS,
    SCANNER_TIMEOUT_MS
} from '../config/scans.js'


export type ScanVerdict = 'CLEAN' | 'INFECTED'

export type ScannerMode = 'mock' | 'clamav'

export type ScanResult = {

    verdict: ScanVerdict

    scanner: string

    message: string

}

export type ScannerSummary = {

    name: string

    mode: ScannerMode

}

export interface AttachmentScanner {

    readonly name: string

    readonly mode: ScannerMode

    scanFile(filePath: string): Promise<ScanResult>

}


export class ScannerUnavailableError extends Error {

    constructor(message: string) {
        super(message)
        this.name = 'ScannerUnavailableError'
    }

}


// EICAR's standard antivirus test file. It is a harmless ASCII string used to
// verify that a scanner is wired correctly. It must never be treated as real
// malware, but the demo scanner intentionally rejects it.

const EICAR_SIGNATURE =
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'


function delay(milliseconds: number): Promise<void> {

    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds)
    })

}


export class MockEicarScanner implements AttachmentScanner {

    readonly name = 'mock-eicar-demo'

    readonly mode = 'mock'

    private readonly delayMs: number

    constructor(delayMs: number) {
        this.delayMs = delayMs
    }

    async scanFile(filePath: string): Promise<ScanResult> {

        // A short delay makes the SCANNING state observable in the dashboard.

        await delay(this.delayMs)

        const content = await readFile(filePath)

        if (content.includes(Buffer.from(EICAR_SIGNATURE, 'ascii'))) {

            return {

                verdict: 'INFECTED',

                scanner: this.name,

                message: 'EICAR test signature detected'

            }

        }

        return {

            verdict: 'CLEAN',

            scanner: this.name,

            message: 'Demo scanner found no EICAR test signature'

        }

    }

}


function openSocket(
    host: string,
    port: number,
    timeoutMs: number
): Promise<Socket> {

    return new Promise<Socket>((resolve, reject) => {

        const socket = createConnection({
            host,
            port
        })

        const timer = setTimeout(() => {

            socket.destroy()

            reject(new ScannerUnavailableError(
                'Timed out while connecting to ClamAV'
            ))

        }, timeoutMs)

        socket.once('connect', () => {

            clearTimeout(timer)

            resolve(socket)

        })

        socket.once('error', (error) => {

            clearTimeout(timer)

            reject(new ScannerUnavailableError(
                `Could not connect to ClamAV: ${error.message}`
            ))

        })

    })

}


function waitForDrain(socket: Socket): Promise<void> {

    return new Promise<void>((resolve, reject) => {

        function cleanup(): void {

            socket.off('drain', onDrain)
            socket.off('error', onError)
            socket.off('close', onClose)

        }

        function onDrain(): void {

            cleanup()
            resolve()

        }

        function onError(error: Error): void {

            cleanup()
            reject(error)

        }

        function onClose(): void {

            cleanup()
            reject(new ScannerUnavailableError(
                'ClamAV closed the connection while receiving the file'
            ))

        }

        socket.once('drain', onDrain)
        socket.once('error', onError)
        socket.once('close', onClose)

    })

}


export class ClamAvScanner implements AttachmentScanner {

    readonly name = 'clamav'

    readonly mode = 'clamav'

    private readonly host: string

    private readonly port: number

    private readonly timeoutMs: number

    constructor(host: string, port: number, timeoutMs: number) {

        this.host = host
        this.port = port
        this.timeoutMs = timeoutMs

    }

    async scanFile(filePath: string): Promise<ScanResult> {

        const socket = await openSocket(
            this.host,
            this.port,
            this.timeoutMs
        )

        try {

            return await this.runInstream(socket, filePath)

        } finally {

            socket.destroy()

        }

    }

    private runInstream(
        socket: Socket,
        filePath: string
    ): Promise<ScanResult> {

        return new Promise<ScanResult>((resolve, reject) => {

            let settled = false
            let response = ''

            const timer = setTimeout(() => {

                fail(new Error('ClamAV scan timed out'))

            }, this.timeoutMs)

            function finish(rawResponse: string): void {

                if (settled) {
                    return
                }

                const text = rawResponse
                    .replaceAll('\0', '')
                    .trim()

                if (!text) {

                    fail(new Error('ClamAV returned an empty response'))

                    return

                }

                if (text.endsWith('OK')) {

                    settled = true
                    clearTimeout(timer)

                    resolve({

                        verdict: 'CLEAN',

                        scanner: 'clamav',

                        message: 'No threats detected by ClamAV'

                    })

                    return

                }

                const foundIndex = text.lastIndexOf('FOUND')

                if (foundIndex !== -1) {

                    const signature = text
                        .slice(0, foundIndex)
                        .replace(/^stream:\s*/i, '')
                        .trim()

                    settled = true
                    clearTimeout(timer)

                    resolve({

                        verdict: 'INFECTED',

                        scanner: 'clamav',

                        message: signature || 'ClamAV detected malware'

                    })

                    return

                }

                fail(new Error(`Unexpected ClamAV response: ${text}`))

            }

            function fail(error: unknown): void {

                if (settled) {
                    return
                }

                settled = true
                clearTimeout(timer)
                socket.destroy()

                reject(new ScannerUnavailableError(
                    error instanceof Error
                        ? error.message
                        : 'ClamAV scan failed'
                ))

            }

            socket.on('data', (chunk: Buffer) => {

                response += chunk.toString('utf8')

                if (response.length > 8192) {

                    fail(new Error('ClamAV response was too large'))

                    return

                }

                if (response.includes('\0')) {

                    finish(response)

                }

            })

            socket.once('error', (error) => {
                fail(error)
            })

            socket.once('close', () => {

                if (!settled) {
                    finish(response)
                }

            })

            socket.write(Buffer.from('zINSTREAM\0', 'utf8'))

            void (async () => {

                try {

                    const stream = createReadStream(filePath, {
                        highWaterMark: 64 * 1024
                    })

                    for await (const chunk of stream) {

                        if (settled) {
                            return
                        }

                        const data = Buffer.isBuffer(chunk)
                            ? chunk
                            : Buffer.from(chunk)

                        const length = Buffer.allocUnsafe(4)

                        length.writeUInt32BE(data.length, 0)

                        if (!socket.write(length)) {
                            await waitForDrain(socket)
                        }

                        if (!socket.write(data)) {
                            await waitForDrain(socket)
                        }

                    }

                    if (!settled) {

                        // A zero-length chunk terminates the INSTREAM request.

                        socket.write(Buffer.from([0, 0, 0, 0]))

                    }

                } catch (error) {

                    fail(error)

                }

            })()

        })

    }

}


export function createScanner(): AttachmentScanner {

    if (CLAMAV_HOST) {

        return new ClamAvScanner(
            CLAMAV_HOST,
            CLAMAV_PORT,
            SCANNER_TIMEOUT_MS
        )

    }

    return new MockEicarScanner(MOCK_SCAN_DELAY_MS)

}
