export class UploadRejection extends Error {
    readonly code: string
    readonly statusCode: number

    constructor(code: string, message: string, statusCode = 400) {
        super(message)
        this.name = 'UploadRejection'
        this.code = code
        this.statusCode = statusCode
    }
}

export class UploadLimitError extends UploadRejection {
    constructor(message = 'The upload exceeded the 10 MB limit.') {
        super('too-large', message, 413)
        this.name = 'UploadLimitError'
    }
}
