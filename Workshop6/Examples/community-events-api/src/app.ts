import path from "node:path";
import { fileURLToPath } from "node:url";

import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";

import { env } from "./config/env.js";
import { ApiError } from "./lib/api-error.js";
import authPlugin from "./plugins/auth.js";
import multipartPlugin from "./plugins/multipart.js";
import prismaPlugin from "./plugins/prisma.js";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(currentDirectory, "../public");

export async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: true
    });

    fastify.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
        if (error instanceof ApiError) {
            return reply.code(error.statusCode).send({
                error: {
                    code: error.code,
                    message: error.message,
                    details: error.details
                }
            });
        }

        if (error.validation) {
            return reply.code(400).send({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Request validation failed",
                    details: error.validation
                }
            });
        }

        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
            return reply.code(error.statusCode).send({
                error: {
                    code: error.code || "CLIENT_ERROR",
                    message: error.message,
                    details: null
                }
            });
        }

        request.log.error(error);

        return reply.code(500).send({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "An internal server error occurred",
                details: null
            }
        });
    });

    await fastify.register(cors, {
        origin: env.frontendOrigin ? [env.frontendOrigin] : true,
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    });

    await fastify.register(rateLimit, {
        global: true,
        max: env.rateLimitMax,
        timeWindow: env.rateLimitTimeWindow
    });

    await fastify.register(prismaPlugin);
    await fastify.register(authPlugin);
    await fastify.register(multipartPlugin);

    await fastify.register(authRoutes, {
        prefix: "/api/auth"
    });

    await fastify.register(eventRoutes, {
        prefix: "/api"
    });

    await fastify.register(staticPlugin, {
        root: publicDirectory,
        prefix: "/assets/"
    });

    fastify.get("/", async (_request, reply) => {
        return reply.sendFile("index.html", publicDirectory);
    });

    fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith("/api/")) {
            return reply.code(404).send({
                error: {
                    code: "NOT_FOUND",
                    message: "API endpoint not found.",
                    details: null
                }
            });
        }

        return reply.code(404).send({
            message: "Page not found."
        });
    });

    return fastify;
}
