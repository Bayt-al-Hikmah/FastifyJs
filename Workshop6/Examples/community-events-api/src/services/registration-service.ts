import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { ApiError } from "../lib/api-error.js";
import { isPrismaError } from "../lib/prisma-errors.js";
import { buildPagination } from "../lib/pagination.js";
import {
    registrationSelect,
    serializeRegistration,
    type SerializedRegistration
} from "../lib/serializers.js";
import type { RegistrationListQuery } from "../schemas/registration-schemas.js";

export async function registerForEvent(
    prisma: PrismaClient,
    eventId: number,
    userId: number
): Promise<SerializedRegistration> {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            status: true,
            capacity: true,
            registeredCount: true,
            organizerId: true
        }
    });

    if (!event) {
        throw ApiError.notFound("Event not found.");
    }

    if (event.status !== "PUBLISHED") {
        throw ApiError.badRequest("Cannot register for an unpublished event.");
    }

    if (event.organizerId === userId) {
        throw ApiError.badRequest("You cannot register for an event you organize.");
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const currentEvent = await tx.event.findUnique({
                where: { id: eventId },
                select: { capacity: true, registeredCount: true }
            });

            if (!currentEvent) {
                throw ApiError.notFound("Event not found.");
            }

            if (currentEvent.registeredCount >= currentEvent.capacity) {
                throw ApiError.conflict("This event has reached full capacity.");
            }

            const registration = await tx.eventRegistration.create({
                data: {
                    eventId,
                    userId
                },
                select: registrationSelect
            });

            await tx.event.update({
                where: { id: eventId },
                data: {
                    registeredCount: { increment: 1 }
                }
            });

            return registration;
        });

        return serializeRegistration(result);
    } catch (error) {
        if (isPrismaError(error, ["P2002"])) {
            throw ApiError.conflict("You are already registered for this event.");
        }
        throw error;
    }
}

export async function cancelRegistration(
    prisma: PrismaClient,
    eventId: number,
    userId: number
): Promise<void> {
    const existing = await prisma.eventRegistration.findUnique({
        where: {
            userId_eventId: {
                userId,
                eventId
            }
        }
    });

    if (!existing) {
        throw ApiError.notFound("Registration not found.");
    }

    await prisma.$transaction(async (tx) => {
        await tx.eventRegistration.delete({
            where: {
                userId_eventId: {
                    userId,
                    eventId
                }
            }
        });

        await tx.event.update({
            where: { id: eventId },
            data: {
                registeredCount: { decrement: 1 }
            }
        });
    });
}

export async function listEventRegistrations(
    prisma: PrismaClient,
    eventId: number,
    userId: number,
    userRole: string,
    query: RegistrationListQuery
) {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, organizerId: true }
    });

    if (!event) {
        throw ApiError.notFound("Event not found.");
    }

    if (event.organizerId !== userId && userRole !== "ADMIN") {
        throw ApiError.forbidden("Only the organizer or an admin may view the attendee list.");
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.EventRegistrationWhereInput = { eventId };

    const [total, records] = await Promise.all([
        prisma.eventRegistration.count({ where }),
        prisma.eventRegistration.findMany({
            where,
            orderBy: { registeredAt: "asc" },
            skip,
            take: limit,
            select: registrationSelect
        })
    ]);

    return {
        data: records.map(serializeRegistration),
        meta: buildPagination(page, limit, total)
    };
}

export async function listMyRegistrations(
    prisma: PrismaClient,
    userId: number,
    query: RegistrationListQuery
) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.EventRegistrationWhereInput = { userId };

    const [total, records] = await Promise.all([
        prisma.eventRegistration.count({ where }),
        prisma.eventRegistration.findMany({
            where,
            orderBy: { registeredAt: "desc" },
            skip,
            take: limit,
            select: registrationSelect
        })
    ]);

    return {
        data: records.map(serializeRegistration),
        meta: buildPagination(page, limit, total)
    };
}
