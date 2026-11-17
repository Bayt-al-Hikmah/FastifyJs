/**
 * A small application-level error type. Routes throw it for expected failures
 * and the central error handler turns it into a safe response envelope.
 */

export type ValidationIssue = {

    field: string

    message: string

}


export class ApiError extends Error {

    readonly statusCode: number

    readonly errors?: ValidationIssue[]


    constructor(
        statusCode: number,
        message: string,
        errors?: ValidationIssue[]
    ) {

        super(message)

        this.name = 'ApiError'

        this.statusCode = statusCode

        this.errors = errors

    }

}
