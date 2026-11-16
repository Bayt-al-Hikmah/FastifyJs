import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import Fastify, {
    type FastifyError,
    type FastifyInstance
} from "fastify";

import { config } from "./config.js";
import { ApiError } from "./lib/api-error.js";
import bookRoutes from "./routes/books.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const publicDirectory = path.resolve(currentDirectory, "../public");

type ValidationItem = {
    instancePath?: string;
    message?: string;
    params?: {
        missingProperty?: string;
        additionalProperty?: string;
    };
};

function readValidationField(item: ValidationItem): string {
    const path = item.instancePath?.replace(/^\//, "").replaceAll("/", ".");

    if (path) {
        return path;
    }

    return (
        item.params?.missingProperty ??
        item.params?.additionalProperty ??
        "request"
    );
}

export async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: true
    });

    await fastify.register(cors, {
        origin:
            config.frontendOrigins.length > 0
                ? config.frontendOrigins
                : true,
        credentials: false,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Accept"],
        exposedHeaders: [
            "Location",
            "Retry-After",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset"
        ]
    });

    await fastify.register(rateLimit, {
        global: false,
        max: 120,
        timeWindow: "1 minute",
        errorResponseBuilder: (_request, context) => {
            return {
                error: {
                    code: "RATE_LIMITED",
                    message: `Too many requests. Try again after ${context.after}.`,
                    details: {
                        limit: context.max,
                        retryAfter: context.after
                    }
                }
            };
        }
    });

    fastify.setErrorHandler<FastifyError>((error, request, reply) => {
        if (error.validation) {
            const details = (error.validation as ValidationItem[]).map(
                (item) => {
                    return {
                        field: readValidationField(item),
                        message: item.message ?? "Invalid value."
                    };
                }
            );

            return reply.code(422).send({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Request validation failed.",
                    details
                }
            });
        }

        if (error instanceof ApiError) {
            return reply.code(error.statusCode).send({
                error: {
                    code: error.code,
                    message: error.message,
                    details: error.details
                }
            });
        }

        if (error.code === "FST_ERR_CTP_EMPTY_JSON_BODY") {
            return reply.code(400).send({
                error: {
                    code: "INVALID_JSON",
                    message: "A JSON request body is required.",
                    details: null
                }
            });
        }

        if (error.code === "FST_ERR_CTP_INVALID_JSON_BODY") {
            return reply.code(400).send({
                error: {
                    code: "INVALID_JSON",
                    message: "The request body is not valid JSON.",
                    details: null
                }
            });
        }

        if (error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
            return reply.code(415).send({
                error: {
                    code: "UNSUPPORTED_MEDIA_TYPE",
                    message: "Use Content-Type: application/json for this request.",
                    details: null
                }
            });
        }

        if (
            error.code === "FST_ERR_BODY_TOO_LARGE" ||
            error.code === "FST_ERR_CTP_BODY_TOO_LARGE"
        ) {
            return reply.code(413).send({
                error: {
                    code: "PAYLOAD_TOO_LARGE",
                    message: "The request body is too large.",
                    details: null
                }
            });
        }

        request.log.error(error);

        return reply.code(500).send({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Something went wrong on the server.",
                details: null
            }
        });
    });

    await fastify.register(bookRoutes, {
        prefix: "/api/books"
    });

    await fastify.register(staticPlugin, {
        root: publicDirectory,
        prefix: "/"
    });

    fastify.addHook("onSend", async (_request, reply, payload) => {
        reply.header("X-Content-Type-Options", "nosniff");

        return payload;
    });

    fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith("/api/")) {
            return reply.code(404).send({
                error: {
                    code: "NOT_FOUND",
                    message: `No API route matches ${request.method} ${request.url}.`,
                    details: null
                }
            });
        }

        return reply
            .code(404)
            .type("text/plain; charset=utf-8")
            .send("Page not found. Open / to use the API explorer.");
    });

    return fastify;
}
