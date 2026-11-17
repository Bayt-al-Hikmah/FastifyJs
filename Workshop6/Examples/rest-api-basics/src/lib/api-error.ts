/**
 * An error type for expected, safe-to-display application failures.
 *
 * The central error handler recognises ApiError instances and returns their
 * status code and message. Unexpected errors are logged and replaced with a
 * generic 500 message so that internals never leak to clients.
 */

export interface ValidationIssue {

    field: string

    message: string

}


export class ApiError extends Error {

    public readonly statusCode: number

    public readonly details?: ValidationIssue[]


    constructor(
        statusCode: number,
        message: string,
        details?: ValidationIssue[]
    ) {

        super(message)

        this.name = 'ApiError'

        this.statusCode = statusCode

        this.details = details

        Error.captureStackTrace?.(this, ApiError)

    }


    static notFound(
        message = 'Book not found.'
    ): ApiError {

        return new ApiError(404, message)

    }


    static conflict(
        message = 'A book with this ISBN already exists.'
    ): ApiError {

        return new ApiError(409, message)

    }

}
