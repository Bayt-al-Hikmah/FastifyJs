export type UploadErrorCode =
    | 'missing-file'
    | 'wrong-field'
    | 'too-large'
    | 'empty-file'
    | 'unsupported-type'
    | 'content-mismatch'
    | 'not-multipart'
    | 'not-found'
    | 'upload-failed'

export class UploadRejection extends Error {
    readonly code: UploadErrorCode
    readonly statusCode: number

    constructor(
        code: UploadErrorCode,
        message: string,
        statusCode = 400
    ) {
        super(message)
        this.name = 'UploadRejection'
        this.code = code
        this.statusCode = statusCode
    }
}

export const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
    'missing-file': 'Choose a file before submitting the form.',
    'wrong-field': 'The multipart field must be named "file".',
    'too-large': 'That file is larger than the 2 MB limit.',
    'empty-file': 'Empty files cannot be uploaded.',
    'unsupported-type': 'Only PNG, JPEG, PDF, and TXT files are accepted.',
    'content-mismatch': 'The file content does not match its extension or declared type.',
    'not-multipart': 'The upload request must use multipart/form-data.',
    'not-found': 'That file is no longer available.',
    'upload-failed': 'The upload could not be stored. Please try again.'
}
