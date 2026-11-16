import jwt from "@fastify/jwt";
import fp from "fastify-plugin";

import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyReply,
    FastifyRequest
} from "fastify";

import { env } from "../config/env.js";
import type { AuthenticatedUser } from "../types/auth.js";
import { publicUserSelect } from "../lib/serializers.js";

const issuer = "community-events-api";

function sendAuthError(
    reply: FastifyReply,
    code: string,
    message: string
): void {
    void reply
        .header("WWW-Authenticate", "Bearer")
        .code(401)
        .send({
            error: {
                code,
                message,
                details: null
            }
        });
}

function parseUserId(subject: string): number | null {
    if (!/^[1-9]\d*$/.test(subject)) {
        return null;
    }

    const userId = Number(subject);

    if (
        !Number.isSafeInteger(userId) ||
        userId <= 0 ||
        userId > 2_147_483_647
    ) {
        return null;
    }

    return userId;
}

async function loadUser(
    fastify: FastifyInstance,
    request: FastifyRequest
): Promise<AuthenticatedUser | null> {
    const userId = parseUserId(request.user.sub);

    if (userId === null) {
        return null;
    }

    return fastify.prisma.user.findUnique({
        where: {
            id: userId
        },
        select: publicUserSelect
    });
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(jwt, {
        secret: env.jwtSecret,
        sign: {
            algorithm: "HS256",
            expiresIn: env.accessTokenExpiresIn,
            iss: issuer
        },
        verify: {
            algorithms: ["HS256"],
            allowedIss: issuer
        }
    });

    fastify.decorateRequest("currentUser", null);

    fastify.decorate("authenticate", async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            sendAuthError(
                reply,
                "INVALID_TOKEN",
                "A valid Bearer access token is required."
            );

            return;
        }

        const user = await loadUser(fastify, request);

        if (!user) {
            sendAuthError(
                reply,
                "INVALID_TOKEN",
                "The access token does not identify an active account."
            );

            return;
        }

        request.currentUser = user;
    });

    fastify.decorate("optionalAuthenticate", async (request) => {
        try {
            await request.jwtVerify();
        } catch {
            request.currentUser = null;

            return;
        }

        request.currentUser = await loadUser(fastify, request);
    });

    fastify.decorate("authorize", (...roles) => {
        return async (request, reply) => {
            if (!request.currentUser) {
                sendAuthError(
                    reply,
                    "AUTHENTICATION_REQUIRED",
                    "Authentication is required for this operation."
                );

                return;
            }

            if (!roles.includes(request.currentUser.role)) {
                void reply.code(403).send({
                    error: {
                        code: "FORBIDDEN",
                        message:
                            "You do not have permission to perform this operation.",
                        details: null
                    }
                });
            }
        };
    });
};

export default fp(authPlugin, {
    name: "auth"
});
