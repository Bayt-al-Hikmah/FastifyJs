export type FieldError = {

    field: string

    message: string

}


/**
 * A route-level error carrying an HTTP status and a safe client message.
 * The central error handler turns it into the standard error envelope.
 */
export class ApiError extends Error {

    readonly statusCode: number

    readonly details?: FieldError[]


    constructor(
        statusCode: number,
        message: string,
        details?: FieldError[]
    ) {

        super(message)

        this.name = 'ApiError'
        this.statusCode = statusCode
        this.details = details

    }

}
