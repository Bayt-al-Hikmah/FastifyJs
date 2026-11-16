import type { Prisma } from "../generated/prisma/client.js";

import type { PublicUser } from "../types/auth.js";

export const publicUserSelect = {
    id: true,
    username: true,
    email: true,
    role: true,
    createdAt: true
} satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{
    select: typeof publicUserSelect;
}>;

export function serializePublicUser(user: PublicUserRecord): PublicUser {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString()
    };
}

export const eventSelect = {
    id: true,
    title: true,
    description: true,
    location: true,
    startsAt: true,
    capacity: true,
    registeredCount: true,
    category: true,
    status: true,
    organizerId: true,
    createdAt: true,
    updatedAt: true,
    organizer: {
        select: {
            id: true,
            username: true
        }
    },
    cover: {
        select: {
            id: true,
            mimeType: true,
            sizeBytes: true
        }
    }
} satisfies Prisma.EventSelect;

export type EventRecord = Prisma.EventGetPayload<{
    select: typeof eventSelect;
}>;

export type SerializedEvent = {
    id: number;
    title: string;
    description: string;
    location: string;
    startsAt: string;
    capacity: number;
    registeredCount: number;
    category: string;
    status: string;
    organizerId: number;
    organizer: {
        id: number;
        username: string;
    };
    cover: {
        id: number;
        mimeType: string;
        sizeBytes: number;
        url: string;
    } | null;
    coverUrl: string | null;
    createdAt: string;
    updatedAt: string;
};

export function serializeEvent(event: EventRecord): SerializedEvent {
    const coverUrl = event.cover
        ? `/api/events/${event.id}/cover`
        : null;

    return {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: event.startsAt.toISOString(),
        capacity: event.capacity,
        registeredCount: event.registeredCount,
        category: event.category,
        status: event.status,
        organizerId: event.organizerId,
        organizer: {
            id: event.organizer.id,
            username: event.organizer.username
        },
        cover: event.cover && coverUrl
            ? {
                  id: event.cover.id,
                  mimeType: event.cover.mimeType,
                  sizeBytes: event.cover.sizeBytes,
                  url: coverUrl
              }
            : null,
        coverUrl,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString()
    };
}

export const registrationSelect = {
    userId: true,
    eventId: true,
    registeredAt: true,
    user: {
        select: {
            id: true,
            username: true,
            email: true
        }
    }
} satisfies Prisma.EventRegistrationSelect;

export type RegistrationRecord = Prisma.EventRegistrationGetPayload<{
    select: typeof registrationSelect;
}>;

export function serializeRegistration(registration: RegistrationRecord) {
    return {
        userId: registration.userId,
        eventId: registration.eventId,
        registeredAt: registration.registeredAt.toISOString(),
        user: registration.user
    };
}

export const userRegistrationSelect = {
    eventId: true,
    registeredAt: true,
    event: {
        select: eventSelect
    }
} satisfies Prisma.EventRegistrationSelect;

export type UserRegistrationRecord = Prisma.EventRegistrationGetPayload<{
    select: typeof userRegistrationSelect;
}>;

export function serializeUserRegistration(
    registration: UserRegistrationRecord
) {
    return {
        eventId: registration.eventId,
        registeredAt: registration.registeredAt.toISOString(),
        event: serializeEvent(registration.event)
    };
}
