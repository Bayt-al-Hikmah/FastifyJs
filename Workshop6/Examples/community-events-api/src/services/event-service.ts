import type { Readable } from "node:stream";

import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { ApiError } from "../lib/api-error.js";
import {
    removeStoredCover,
    resolveCoverPath,
    saveUploadedCover
} from "../lib/media-storage.js";
import { buildPagination } from "../lib/pagination.js";
import {
    eventSelect,
    serializeEvent,
    type SerializedEvent
} from "../lib/serializers.js";
import type {
    CreateEventBody,
    EventCategoryValue,
    EventListQuery,
    MyEventListQuery,
    UpdateEventBody
} from "../schemas/event-schemas.js";
import type { AuthenticatedUser } from "../types/auth.js";

export async function listPublishedEvents(
    prisma: PrismaClient,
    query: EventListQuery
) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
        status: "PUBLISHED"
    };

    if (query.category) {
        where.category = query.category as Prisma.EnumEventCategoryFilter;
    }

    if (query.search) {
        where.OR = [
            {
                title: {
                    contains: query.search,
                    mode: "insensitive"
                }
            },
            {
                description: {
                    contains: query.search,
                    mode: "insensitive"
                }
            },
            {
                location: {
                    contains: query.search,
                    mode: "insensitive"
                }
            }
        ];
    }

    let orderBy: Prisma.EventOrderByWithRelationInput = { startsAt: "asc" };

    if (query.sort === "newest") {
        orderBy = { createdAt: "desc" };
    } else if (query.sort === "title") {
        orderBy = { title: "asc" };
    }

    const [total, events] = await Promise.all([
        prisma.event.count({ where }),
        prisma.event.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: eventSelect
        })
    ]);

    return {
        data: events.map(serializeEvent),
        meta: buildPagination(page, limit, total)
    };
}

export async function listMyEvents(
    prisma: PrismaClient,
    userId: number,
    query: MyEventListQuery
) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
        organizerId: userId
    };

    if (query.status) {
        where.status = query.status as Prisma.EnumEventStatusFilter;
    }

    if (query.category) {
        where.category = query.category as Prisma.EnumEventCategoryFilter;
    }

    if (query.search) {
        where.OR = [
            { title: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
            { location: { contains: query.search, mode: "insensitive" } }
        ];
    }

    const [total, events] = await Promise.all([
        prisma.event.count({ where }),
        prisma.event.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            select: eventSelect
        })
    ]);

    return {
        data: events.map(serializeEvent),
        meta: buildPagination(page, limit, total)
    };
}

export async function getEventById(
    prisma: PrismaClient,
    eventId: number,
    currentUser?: AuthenticatedUser
): Promise<SerializedEvent> {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: eventSelect
    });

    if (!event) {
        throw ApiError.notFound("Event not found.");
    }

    if (event.status === "DRAFT") {
        const isOwner = currentUser && currentUser.id === event.organizerId;
        const isAdmin = currentUser && currentUser.role === "ADMIN";

        if (!isOwner && !isAdmin) {
            throw ApiError.notFound("Event not found.");
        }
    }

    return serializeEvent(event);
}

export async function createEvent(
    prisma: PrismaClient,
    userId: number,
    input: CreateEventBody
): Promise<SerializedEvent> {
    const startsAt = new Date(input.startsAt);

    if (Number.isNaN(startsAt.getTime())) {
        throw ApiError.badRequest("Invalid event starting date and time.");
    }

    const event = await prisma.event.create({
        data: {
            title: input.title,
            description: input.description,
            location: input.location,
            startsAt,
            capacity: input.capacity,
            category: (input.category ?? "OTHER") as Prisma.EventCreateInput["category"],
            status: (input.status ?? "DRAFT") as Prisma.EventCreateInput["status"],
            organizerId: userId
        },
        select: eventSelect
    });

    return serializeEvent(event);
}

export async function updateEvent(
    prisma: PrismaClient,
    eventId: number,
    userId: number,
    userRole: string,
    input: UpdateEventBody
): Promise<SerializedEvent> {
    const existing = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, organizerId: true, registeredCount: true }
    });

    if (!existing) {
        throw ApiError.notFound("Event not found.");
    }

    if (existing.organizerId !== userId && userRole !== "ADMIN") {
        throw ApiError.forbidden("You do not have permission to modify this event.");
    }

    const data: Prisma.EventUpdateInput = {};

    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.location !== undefined) data.location = input.location;
    if (input.category !== undefined) data.category = input.category;
    if (input.status !== undefined) data.status = input.status;

    if (input.startsAt !== undefined) {
        const parsed = new Date(input.startsAt);
        if (Number.isNaN(parsed.getTime())) {
            throw ApiError.badRequest("Invalid event start date.");
        }
        data.startsAt = parsed;
    }

    if (input.capacity !== undefined) {
        if (input.capacity < existing.registeredCount) {
            throw ApiError.conflict(
                `Capacity cannot be reduced below the current registration count (${existing.registeredCount}).`
            );
        }
        data.capacity = input.capacity;
    }

    const updated = await prisma.event.update({
        where: { id: eventId },
        data,
        select: eventSelect
    });

    return serializeEvent(updated);
}

export async function deleteEvent(
    prisma: PrismaClient,
    eventId: number,
    userId: number,
    userRole: string
): Promise<void> {
    const existing = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizerId: true,
            cover: {
                select: { storageName: true }
            }
        }
    });

    if (!existing) {
        throw ApiError.notFound("Event not found.");
    }

    if (existing.organizerId !== userId && userRole !== "ADMIN") {
        throw ApiError.forbidden("You do not have permission to delete this event.");
    }

    if (existing.cover?.storageName) {
        await removeStoredCover(existing.cover.storageName);
    }

    await prisma.event.delete({
        where: { id: eventId }
    });
}

export async function uploadEventCover(
    prisma: PrismaClient,
    eventId: number,
    userId: number,
    userRole: string,
    fileStream: Readable,
    originalName: string
) {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizerId: true,
            cover: {
                select: { storageName: true }
            }
        }
    });

    if (!event) {
        throw ApiError.notFound("Event not found.");
    }

    if (event.organizerId !== userId && userRole !== "ADMIN") {
        throw ApiError.forbidden("You do not have permission to upload a cover for this event.");
    }

    const stored = await saveUploadedCover(fileStream);

    if (event.cover?.storageName) {
        await removeStoredCover(event.cover.storageName);
    }

    await prisma.eventCover.upsert({
        where: { eventId },
        create: {
            eventId,
            storageName: stored.storageName,
            originalName: originalName.slice(0, 180),
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes
        },
        update: {
            storageName: stored.storageName,
            originalName: originalName.slice(0, 180),
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes
        }
    });

    return {
        coverUrl: `/api/events/${eventId}/cover`,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes
    };
}

export async function getEventCoverPath(
    prisma: PrismaClient,
    eventId: number
): Promise<{ filePath: string; mimeType: string }> {
    const cover = await prisma.eventCover.findUnique({
        where: { eventId },
        select: { storageName: true, mimeType: true }
    });

    if (!cover) {
        throw ApiError.notFound("Event cover not found.");
    }

    return {
        filePath: resolveCoverPath(cover.storageName),
        mimeType: cover.mimeType
    };
}

export async function deleteEventCover(
    prisma: PrismaClient,
    eventId: number,
    userId: number,
    userRole: string
): Promise<void> {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizerId: true,
            cover: {
                select: { storageName: true }
            }
        }
    });

    if (!event) {
        throw ApiError.notFound("Event not found.");
    }

    if (event.organizerId !== userId && userRole !== "ADMIN") {
        throw ApiError.forbidden("You do not have permission to delete this cover.");
    }

    if (event.cover?.storageName) {
        await removeStoredCover(event.cover.storageName);
        await prisma.eventCover.delete({ where: { eventId } });
    }
}
