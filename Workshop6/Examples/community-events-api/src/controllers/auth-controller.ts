import type { FastifyReply, FastifyRequest } from "fastify";
import type { LoginBody, RegisterBody } from "../schemas/auth-schemas.js";
import { authenticateCredentials, registerUser } from "../services/auth-service.js";
import { serializePublicUser } from "../lib/serializers.js";

export async function handleRegister(
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply
) {
    const user = await registerUser(request.server.prisma, request.body);

    const token = request.server.jwt.sign({
        sub: String(user.id),
        role: user.role
    });

    return reply.code(201).send({
        data: {
            token,
            user: serializePublicUser(user)
        }
    });
}

export async function handleLogin(
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply
) {
    const user = await authenticateCredentials(
        request.server.prisma,
        request.body.email,
        request.body.password
    );

    const token = request.server.jwt.sign({
        sub: String(user.id),
        role: user.role
    });

    return reply.code(200).send({
        data: {
            token,
            user: serializePublicUser(user)
        }
    });
}

export async function handleGetMe(
    request: FastifyRequest,
    reply: FastifyReply
) {
    return reply.code(200).send({
        data: request.currentUser
    });
}
