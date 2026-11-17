export type ValidationIssue = {

    field: string

    message: string

}


/**
 * A transport-independent application error. Services throw it and the
 * central Fastify error handler turns it into the documented JSON envelope.
 */
export class ApiError extends Error {

    readonly statusCode: number

    readonly code: string

    readonly details: ValidationIssue[]


    constructor(
        statusCode: number,
        code: string,
        message: string,
        details: ValidationIssue[] = []
    ) {

        super(message)

        this.name = 'ApiError'
        this.statusCode = statusCode
        this.code = code
        this.details = details

    }


    static badRequest(
        message = 'The request could not be processed.',
        details: ValidationIssue[] = []
    ): ApiError {

        return new ApiError(400, 'BAD_REQUEST', message, details)

    }


    static unauthorized(
        message = 'Authentication is required.'
    ): ApiError {

        return new ApiError(401, 'UNAUTHORIZED', message)

    }


    static forbidden(
        message = 'You do not have permission to perform this action.'
    ): ApiError {

        return new ApiError(403, 'FORBIDDEN', message)

    }


    static notFound(
        message = 'The requested resource was not found.'
    ): ApiError {

        return new ApiError(404, 'NOT_FOUND', message)

    }


    static conflict(message: string): ApiError {

        return new ApiError(409, 'CONFLICT', message)

    }


    static unsupportedMediaType(
        message = 'This file type is not supported.'
    ): ApiError {

        return new ApiError(415, 'UNSUPPORTED_FILE_TYPE', message)

    }


    static payloadTooLarge(
        message = 'The uploaded file is too large.'
    ): ApiError {

        return new ApiError(413, 'PAYLOAD_TOO_LARGE', message)

    }


    static tooManyRequests(
        message = 'Too many requests. Please try again later.'
    ): ApiError {

        return new ApiError(429, 'TOO_MANY_REQUESTS', message)

    }

}


export function isApiError(error: unknown): error is ApiError {

    return error instanceof ApiError

}
