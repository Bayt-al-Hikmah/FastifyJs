import type { FastifyReply, FastifyRequest } from "fastify";
import type { RegistrationListQuery } from "../schemas/registration-schemas.js";
import {
    cancelRegistration,
    listEventRegistrations,
    listMyRegistrations,
    registerForEvent
} from "../services/registration-service.js";

type IdParam = {
    id: number;
};

export async function handleRegisterForEvent(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    const registration = await registerForEvent(
        request.server.prisma,
        Number(request.params.id),
        user.id
    );

    return reply.code(201).send({
        data: registration
    });
}

export async function handleCancelRegistration(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    await cancelRegistration(
        request.server.prisma,
        Number(request.params.id),
        user.id
    );

    return reply.code(204).send();
}

export async function handleListEventRegistrations(
    request: FastifyRequest<{ Params: IdParam; Querystring: RegistrationListQuery }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    const result = await listEventRegistrations(
        request.server.prisma,
        Number(request.params.id),
        user.id,
        user.role,
        request.query
    );

    return reply.code(200).send(result);
}

export async function handleListMyRegistrations(
    request: FastifyRequest<{ Querystring: RegistrationListQuery }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    const result = await listMyRegistrations(
        request.server.prisma,
        user.id,
        request.query
    );

    return reply.code(200).send(result);
}
