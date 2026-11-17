import type {
    Prisma,
    PrismaClient
} from '../generated/prisma/client.js'

import { ApiError } from '../lib/api-error.js'
import { buildPageWindow } from '../lib/pagination.js'
import { buildPaginationMeta } from '../lib/pagination.js'
import {
    eventDetailSelect,
    eventListSelect,
    serializeEventDetail,
    serializeEventSummary
} from '../lib/serializers.js'

import type {
    EventCategoryValue,
    EventDetail,
    EventDetailRow,
    EventListRow,
    EventSummary
} from '../lib/serializers.js'


export type CreateEventInput = {

    title: string

    description: string

    location: string

    startsAt: string

    capacity: number

    category?: EventCategoryValue

}


export type UpdateEventInput = {

    title?: string

    description?: string

    location?: string

    startsAt?: string

    capacity?: number

    category?: EventCategoryValue

    status?: 'DRAFT' | 'PUBLISHED'

}


export type ListEventsQuery = {

    search?: string

    category?: EventCategoryValue

    page?: number

    limit?: number

}


export type ListMyEventsQuery = {

    status?: 'DRAFT' | 'PUBLISHED'

    page?: number

    limit?: number

}


export type CoverInput = {

    storageName: string

    mimeType: string

    sizeBytes: number

    originalName: string

}


export type CoverResult = {

    id: number

    mimeType: string

    sizeBytes: number

}


export type EventPage = {

    events: EventSummary[]

    pagination: ReturnType<typeof buildPaginationMeta>

}


function parseStartsAt(value: string): Date {

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {

        throw ApiError.badRequest(
            'startsAt must be a valid date-time value.'
        )

    }

    return date

}


export async function listPublishedEvents(
    prisma: PrismaClient,
    query: ListEventsQuery
): Promise<EventPage> {

    const { page, limit, skip } = buildPageWindow(query)

    const where: Prisma.EventWhereInput = {

        status: 'PUBLISHED',

        ...(query.search
            ? {
                title: {
                    contains: query.search,
                    mode: 'insensitive' as const
                }
            }
            : {}),

        ...(query.category
            ? { category: query.category }
            : {})

    }


    const [rows, total] = await prisma.$transaction([

        prisma.event.findMany({

            where,

            select: eventListSelect,

            orderBy: {
                startsAt: 'asc'
            },

            skip,

            take: limit

        }),

        prisma.event.count({
            where
        })

    ])


    return {

        events: (rows as EventListRow[]).map(
            serializeEventSummary
        ),

        pagination: buildPaginationMeta(
            page,
            limit,
            total
        )

    }

}


export async function getPublishedEventById(
    prisma: PrismaClient,
    eventId: number
): Promise<EventDetail> {

    const row = await prisma.event.findFirst({

        where: {
            id: eventId,
            status: 'PUBLISHED'
        },

        select: eventDetailSelect

    })


    if (!row) {

        throw ApiError.notFound(
            'Event not found.'
        )

    }


    return serializeEventDetail(
        row as EventDetailRow
    )

}


export async function listMyEvents(
    prisma: PrismaClient,
    userId: number,
    query: ListMyEventsQuery
): Promise<EventPage> {

    const { page, limit, skip } = buildPageWindow(query)

    const where: Prisma.EventWhereInput = {

        organizerId: userId,

        ...(query.status
            ? { status: query.status }
            : {})

    }


    const [rows, total] = await prisma.$transaction([

        prisma.event.findMany({

            where,

            select: eventListSelect,

            orderBy: {
                startsAt: 'asc'
            },

            skip,

            take: limit

        }),

        prisma.event.count({
            where
        })

    ])


    return {

        events: (rows as EventListRow[]).map(
            serializeEventSummary
        ),

        pagination: buildPaginationMeta(
            page,
            limit,
            total
        )

    }

}


export async function createEvent(
    prisma: PrismaClient,
    userId: number,
    input: CreateEventInput
): Promise<EventDetail> {

    const row = await prisma.event.create({

        data: {
            title: input.title,
            description: input.description,
            location: input.location,
            startsAt: parseStartsAt(input.startsAt),
            capacity: input.capacity,
            category: input.category ?? 'OTHER',
            status: 'DRAFT',

            // Ownership always comes from the verified token.
            organizerId: userId
        },

        select: eventDetailSelect

    })


    return serializeEventDetail(
        row as EventDetailRow
    )

}


export async function updateOwnedEvent(
    prisma: PrismaClient,
    userId: number,
    eventId: number,
    input: UpdateEventInput
): Promise<EventDetail> {

    const data: Prisma.EventUpdateManyMutationInput = {}


    if (input.title !== undefined) {
        data.title = input.title
    }

    if (input.description !== undefined) {
        data.description = input.description
    }

    if (input.location !== undefined) {
        data.location = input.location
    }

    if (input.startsAt !== undefined) {
        data.startsAt = parseStartsAt(input.startsAt)
    }

    if (input.capacity !== undefined) {
        data.capacity = input.capacity
    }

    if (input.category !== undefined) {
        data.category = input.category
    }

    if (input.status !== undefined) {
        data.status = input.status
    }


    const [row] = await prisma.event.updateManyAndReturn({

        where: {
            id: eventId,
            organizerId: userId
        },

        data,

        select: eventDetailSelect

    })


    if (!row) {

        throw ApiError.notFound(
            'Event not found.'
        )

    }


    return serializeEventDetail(
        row as EventDetailRow
    )

}


/**
 * Return the old storage name so the controller can remove the file after a
 * successful database delete. Prisma Cascades the metadata row for us.
 */
export async function deleteOwnedEvent(
    prisma: PrismaClient,
    userId: number,
    eventId: number
): Promise<string | null> {

    const ownedEvent = await prisma.event.findFirst({

        where: {
            id: eventId,
            organizerId: userId
        },

        select: {
            cover: {
                select: {
                    storageName: true
                }
            }
        }

    })


    if (!ownedEvent) {

        throw ApiError.notFound(
            'Event not found.'
        )

    }


    const result = await prisma.event.deleteMany({

        where: {
            id: eventId,
            organizerId: userId
        }

    })


    if (result.count === 0) {

        throw ApiError.notFound(
            'Event not found.'
        )

    }


    return ownedEvent.cover?.storageName ?? null

}


export async function upsertEventCover(
    prisma: PrismaClient,
    userId: number,
    eventId: number,
    input: CoverInput
): Promise<{
    cover: CoverResult
    previousStorageName: string | null
}> {

    const ownedEvent = await prisma.event.findFirst({

        where: {
            id: eventId,
            organizerId: userId
        },

        select: {
            cover: {
                select: {
                    storageName: true
                }
            }
        }

    })


    if (!ownedEvent) {

        throw ApiError.notFound(
            'Event not found.'
        )

    }


    const cover = await prisma.eventCover.upsert({

        where: {
            eventId
        },

        create: {
            eventId,
            storageName: input.storageName,
            originalName: input.originalName,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes
        },

        update: {
            storageName: input.storageName,
            originalName: input.originalName,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes
        },

        select: {
            id: true,
            mimeType: true,
            sizeBytes: true
        }

    })


    return {

        cover,

        previousStorageName:
            ownedEvent.cover?.storageName ?? null

    }

}


export async function removeEventCover(
    prisma: PrismaClient,
    userId: number,
    eventId: number
): Promise<string> {

    const ownedEvent = await prisma.event.findFirst({

        where: {
            id: eventId,
            organizerId: userId
        },

        select: {
            cover: {
                select: {
                    storageName: true
                }
            }
        }

    })


    if (!ownedEvent?.cover) {

        throw ApiError.notFound(
            'This event does not have a cover image.'
        )

    }


    await prisma.eventCover.delete({

        where: {
            eventId
        }

    })


    return ownedEvent.cover.storageName

}


export type CoverMetadata = {

    storageName: string

    mimeType: string

    originalName: string

    isPrivate: boolean

}


export async function getCoverMetadata(
    prisma: PrismaClient,
    eventId: number,
    viewerId: number | null
): Promise<CoverMetadata> {

    const event = await prisma.event.findUnique({

        where: {
            id: eventId
        },

        select: {
            status: true,
            organizerId: true,
            cover: {
                select: {
                    storageName: true,
                    mimeType: true,
                    originalName: true
                }
            }
        }

    })


    const canView =
        event?.cover !== null &&
        event?.cover !== undefined &&
        (
            event.status === 'PUBLISHED' ||
            event.organizerId === viewerId
        )


    if (!event?.cover || !canView) {

        throw ApiError.notFound(
            'Cover image not found.'
        )

    }


    return {

        storageName: event.cover.storageName,

        mimeType: event.cover.mimeType,

        originalName: event.cover.originalName,

        isPrivate: event.status !== 'PUBLISHED'

    }

}
