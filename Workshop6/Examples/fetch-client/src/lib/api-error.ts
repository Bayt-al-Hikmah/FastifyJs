export type FieldError = {
    field: string
    message: string
}


/**
 * A small application error type. Routes throw it for expected failures and
 * the central error handler turns it into the workshop response envelope.
 */

export class ApiError extends Error {

    public readonly statusCode: number

    public readonly errors: FieldError[] | undefined


    constructor(
        message: string,
        statusCode: number,
        errors?: FieldError[]
    ) {

        super(message)

        this.name = 'ApiError'

        this.statusCode = statusCode

        this.errors = errors

    }

}


export function notFound(message: string): ApiError {

    return new ApiError(message, 404)

}


export function badRequest(
    message: string,
    errors?: FieldError[]
): ApiError {

    return new ApiError(message, 400, errors)

}
