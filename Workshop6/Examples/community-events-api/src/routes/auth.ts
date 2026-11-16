import type { FastifyPluginAsync } from "fastify";
import {
    handleGetMe,
    handleLogin,
    handleRegister
} from "../controllers/auth-controller.js";
import {
    loginBodySchema,
    registerBodySchema,
    type LoginBody,
    type RegisterBody
} from "../schemas/auth-schemas.js";

const authRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post<{ Body: RegisterBody }>(
        "/register",
        {
            schema: {
                body: registerBodySchema
            },
            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: "15 minutes"
                }
            }
        },
        handleRegister
    );

    fastify.post<{ Body: LoginBody }>(
        "/login",
        {
            schema: {
                body: loginBodySchema
            },
            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: "15 minutes"
                }
            }
        },
        handleLogin
    );

    fastify.get(
        "/me",
        {
            preHandler: [fastify.authenticate]
        },
        handleGetMe
    );
};

export default authRoutes;
