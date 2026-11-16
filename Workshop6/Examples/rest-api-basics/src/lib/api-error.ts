export class ApiError extends Error {
    readonly statusCode: number;

    readonly code: string;

    readonly details: unknown;

    constructor(
        statusCode: number,
        code: string,
        message: string,
        details: unknown = null
    ) {
        super(message);

        this.name = "ApiError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }

    static notFound(message: string, details: unknown = null): ApiError {
        return new ApiError(404, "NOT_FOUND", message, details);
    }

    static conflict(message: string, details: unknown = null): ApiError {
        return new ApiError(409, "CONFLICT", message, details);
    }

    static unprocessable(message: string, details: unknown = null): ApiError {
        return new ApiError(422, "UNPROCESSABLE_ENTITY", message, details);
    }

    static tooManyRequests(message: string): ApiError {
        return new ApiError(429, "RATE_LIMITED", message);
    }
}
