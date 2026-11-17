import type { PublicUser, UserRole } from '../types/auth.js'


export type EventCategoryValue =
    'TECHNOLOGY' |
    'EDUCATION' |
    'ART' |
    'COMMUNITY' |
    'SPORTS' |
    'OTHER'

export type EventStatusValue = 'DRAFT' | 'PUBLISHED'


/**
 * The `select` objects are the single source of truth for which database
 * columns may leave the service layer. Password hashes and internal ids of
 * other users are never included.
 */
export const eventListSelect = {

    id: true,

    title: true,

    description: true,

    location: true,

    startsAt: true,

    capacity: true,

    registeredCount: true,

    category: true,

    status: true,

    createdAt: true,

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

} as const


export const eventDetailSelect = {

    ...eventListSelect,

    updatedAt: true

} as const


export const registrationSelect = {

    registeredAt: true,

    event: {
        select: eventListSelect
    }

} as const


export type OrganizerSummary = {

    id: number

    username: string

}


export type CoverSummary = {

    id: number

    mimeType: string

    sizeBytes: number

}


export type EventListRow = {

    id: number

    title: string

    description: string

    location: string

    startsAt: Date

    capacity: number

    registeredCount: number

    category: EventCategoryValue

    status: EventStatusValue

    createdAt: Date

    organizer: OrganizerSummary

    cover: CoverSummary | null

}


export type EventDetailRow = EventListRow & {

    updatedAt: Date

}


export type EventSummary = {

    id: number

    title: string

    description: string

    location: string

    startsAt: string

    capacity: number

    registeredCount: number

    spotsLeft: number

    category: EventCategoryValue

    status: EventStatusValue

    organizer: OrganizerSummary

    hasCover: boolean

    coverUrl: string | null

    createdAt: string

}


export type EventDetail = EventSummary & {

    updatedAt: string

}


export type RegistrationRow = {

    registeredAt: Date

    event: EventListRow

}


export type RegistrationSummary = {

    registeredAt: string

    event: EventSummary

}


export function serializeEventSummary(
    row: EventListRow
): EventSummary {

    return {

        id: row.id,

        title: row.title,

        description: row.description,

        location: row.location,

        startsAt: row.startsAt.toISOString(),

        capacity: row.capacity,

        registeredCount: row.registeredCount,

        spotsLeft: Math.max(
            row.capacity - row.registeredCount,
            0
        ),

        category: row.category,

        status: row.status,

        organizer: {
            id: row.organizer.id,
            username: row.organizer.username
        },

        hasCover: row.cover !== null,

        coverUrl: row.cover
            ? `/api/events/${row.id}/cover`
            : null,

        createdAt: row.createdAt.toISOString()

    }

}


export function serializeEventDetail(
    row: EventDetailRow
): EventDetail {

    return {

        ...serializeEventSummary(row),

        updatedAt: row.updatedAt.toISOString()

    }

}


export function serializeRegistration(
    row: RegistrationRow
): RegistrationSummary {

    return {

        registeredAt: row.registeredAt.toISOString(),

        event: serializeEventSummary(row.event)

    }

}


export type UserRow = {

    id: number

    username: string

    email: string

    role: UserRole

    createdAt: Date

}


export function serializeUser(row: UserRow): PublicUser {

    return {

        id: row.id,

        username: row.username,

        email: row.email,

        role: row.role,

        createdAt: row.createdAt.toISOString()

    }

}
