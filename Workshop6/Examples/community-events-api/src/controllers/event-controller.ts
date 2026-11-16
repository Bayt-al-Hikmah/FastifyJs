import { createReadStream } from "node:fs";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ApiError } from "../lib/api-error.js";
import type {
    CreateEventBody,
    EventListQuery,
    MyEventListQuery,
    UpdateEventBody
} from "../schemas/event-schemas.js";
import {
    createEvent,
    deleteEvent,
    deleteEventCover,
    getEventById,
    getEventCoverPath,
    listMyEvents,
    listPublishedEvents,
    updateEvent,
    uploadEventCover
} from "../services/event-service.js";

type IdParam = {
    id: number;
};

export async function handleListEvents(
    request: FastifyRequest<{ Querystring: EventListQuery }>,
    reply: FastifyReply
) {
    const result = await listPublishedEvents(request.server.prisma, request.query);
    return reply.code(200).send(result);
}

export async function handleListMyEvents(
    request: FastifyRequest<{ Querystring: MyEventListQuery }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    const result = await listMyEvents(request.server.prisma, user.id, request.query);
    return reply.code(200).send(result);
}

export async function handleGetEvent(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
) {
    const event = await getEventById(
        request.server.prisma,
        Number(request.params.id),
        request.currentUser ?? undefined
    );
    return reply.code(200).send({ data: event });
}

export async function handleCreateEvent(
    request: FastifyRequest<{ Body: CreateEventBody }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    const event = await createEvent(request.server.prisma, user.id, request.body);
    return reply.code(201).send({ data: event });
}

export async function handleUpdateEvent(
    request: FastifyRequest<{ Params: IdParam; Body: UpdateEventBody }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    const event = await updateEvent(
        request.server.prisma,
        Number(request.params.id),
        user.id,
        user.role,
        request.body
    );
    return reply.code(200).send({ data: event });
}

export async function handleDeleteEvent(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    await deleteEvent(
        request.server.prisma,
        Number(request.params.id),
        user.id,
        user.role
    );
    return reply.code(204).send();
}

export async function handleUploadCover(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    const part = await request.file();

    if (!part) {
        throw ApiError.badRequest("Cover image file is required.");
    }

    const result = await uploadEventCover(
        request.server.prisma,
        Number(request.params.id),
        user.id,
        user.role,
        part.file,
        part.filename
    );

    return reply.code(201).send({ data: result });
}

export async function handleGetCover(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
) {
    const { filePath, mimeType } = await getEventCoverPath(
        request.server.prisma,
        Number(request.params.id)
    );

    reply.header("Content-Type", mimeType);
    reply.header("Cache-Control", "public, max-age=86400");
    return reply.send(createReadStream(filePath));
}

export async function handleDeleteCover(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
) {
    const user = request.currentUser!;
    await deleteEventCover(
        request.server.prisma,
        Number(request.params.id),
        user.id,
        user.role
    );
    return reply.code(204).send();
}
