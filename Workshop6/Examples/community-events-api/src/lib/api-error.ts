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

    static badRequest(message: string, details: unknown = null): ApiError {
        return new ApiError(400, "BAD_REQUEST", message, details);
    }

    static unauthorized(
        message: string,
        details: unknown = null
    ): ApiError {
        return new ApiError(401, "UNAUTHORIZED", message, details);
    }

    static forbidden(message: string, details: unknown = null): ApiError {
        return new ApiError(403, "FORBIDDEN", message, details);
    }

    static notFound(message: string, details: unknown = null): ApiError {
        return new ApiError(404, "NOT_FOUND", message, details);
    }

    static conflict(message: string, details: unknown = null): ApiError {
        return new ApiError(409, "CONFLICT", message, details);
    }

    static payloadTooLarge(
        message: string,
        details: unknown = null
    ): ApiError {
        return new ApiError(413, "PAYLOAD_TOO_LARGE", message, details);
    }

    static unsupportedMediaType(
        message: string,
        details: unknown = null
    ): ApiError {
        return new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", message, details);
    }

    static unprocessable(
        message: string,
        details: unknown = null
    ): ApiError {
        return new ApiError(422, "UNPROCESSABLE_ENTITY", message, details);
    }

    static tooManyRequests(message: string): ApiError {
        return new ApiError(429, "RATE_LIMITED", message);
    }
}
