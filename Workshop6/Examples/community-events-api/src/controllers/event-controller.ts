import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

import type {
    FastifyReply,
    FastifyRequest
} from 'fastify'

import { ApiError } from '../lib/api-error.js'
import {
    MAX_COVER_SIZE,
    coverPathFor,
    deleteCoverFile,
    saveCoverImage
} from '../lib/media-storage.js'

import {
    createEvent,
    deleteOwnedEvent,
    getCoverMetadata,
    getPublishedEventById,
    listMyEvents,
    listPublishedEvents,
    removeEventCover,
    updateOwnedEvent,
    upsertEventCover
} from '../services/event-service.js'

import type {
    CreateEventInput,
    ListEventsQuery,
    ListMyEventsQuery,
    UpdateEventInput
} from '../services/event-service.js'


type EventIdParams = {

    eventId: number

}


/**
 * Runs before a cover is read. It guarantees that the signed-in user owns the
 * event, so an unauthorised client can never make the server store files for
 * somebody else's event.
 */
export async function requireEventOwner(
    request: FastifyRequest<{ Params: EventIdParams }>,
    _reply: FastifyReply
): Promise<void> {

    const user = request.currentUser


    if (!user) {

        throw ApiError.unauthorized()

    }


    const ownedEvent = await request.server.prisma.event.findFirst({

        where: {
            id: request.params.eventId,
            organizerId: user.id
        },

        select: {
            id: true
        }

    })


    if (!ownedEvent) {

        throw ApiError.notFound(
            'Event not found.'
        )

    }


    request.eventOwnershipId = ownedEvent.id

}


export async function listEvents(
    request: FastifyRequest<{ Querystring: ListEventsQuery }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const page = await listPublishedEvents(
        request.server.prisma,
        {
            ...request.query,
            search: request.query.search?.trim() || undefined
        }
    )

    return reply.code(200).send({

        message: 'Events retrieved successfully.',

        data: page

    })

}


export async function getEvent(
    request: FastifyRequest<{ Params: EventIdParams }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const event = await getPublishedEventById(
        request.server.prisma,
        request.params.eventId
    )

    return reply.code(200).send({

        message: 'Event retrieved successfully.',

        data: {
            event
        }

    })

}


export async function listCurrentUserEvents(
    request: FastifyRequest<{ Querystring: ListMyEventsQuery }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const page = await listMyEvents(
        request.server.prisma,
        request.currentUser!.id,
        request.query
    )

    return reply.code(200).send({

        message: 'Your events retrieved successfully.',

        data: page

    })

}


export async function createEventHandler(
    request: FastifyRequest<{ Body: CreateEventInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const event = await createEvent(
        request.server.prisma,
        request.currentUser!.id,
        request.body
    )

    return reply.code(201).send({

        message: 'Event created successfully as a draft.',

        data: {
            event
        }

    })

}


export async function updateEventHandler(
    request: FastifyRequest<{
        Params: EventIdParams
        Body: UpdateEventInput
    }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const event = await updateOwnedEvent(
        request.server.prisma,
        request.currentUser!.id,
        request.params.eventId,
        request.body
    )

    return reply.code(200).send({

        message: 'Event updated successfully.',

        data: {
            event
        }

    })

}


export async function deleteEventHandler(
    request: FastifyRequest<{ Params: EventIdParams }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const previousStorageName = await deleteOwnedEvent(
        request.server.prisma,
        request.currentUser!.id,
        request.params.eventId
    )


    if (previousStorageName) {

        try {

            await deleteCoverFile(previousStorageName)

        } catch (error) {

            request.log.error(
                error,
                'Could not remove cover file after event deletion'
            )

        }

    }


    return reply.code(204).send()

}


export async function uploadCoverHandler(
    request: FastifyRequest<{ Params: EventIdParams }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const part = await request.file()

    if (!part) {

        throw ApiError.badRequest(
            'Select an image to upload.'
        )

    }


    if (part.fieldname !== 'cover') {

        await part.file.resume()

        throw ApiError.badRequest(
            'Upload the image using the "cover" field.'
        )

    }


    if (part.file.truncated) {

        await part.file.resume()

        throw ApiError.payloadTooLarge(
            `Cover images must be ${MAX_COVER_SIZE / (1024 * 1024)} MB or smaller.`
        )

    }


    const stored = await saveCoverImage(
        part.file,
        part.filename
    )


    try {

        const { cover, previousStorageName } =
            await upsertEventCover(
                request.server.prisma,
                request.currentUser!.id,
                request.params.eventId,
                stored
            )


        if (previousStorageName) {

            try {

                await deleteCoverFile(previousStorageName)

            } catch (error) {

                request.log.error(
                    error,
                    'Could not remove replaced cover file'
                )

            }

        }


        return reply.code(200).send({

            message: 'Event cover uploaded successfully.',

            data: {
                cover: {
                    id: cover.id,
                    mimeType: cover.mimeType,
                    sizeBytes: cover.sizeBytes,
                    url: `/api/events/${request.params.eventId}/cover`
                }
            }

        })

    } catch (error) {

        // The database write failed: do not leave an orphaned file behind.
        await deleteCoverFile(stored.storageName)
            .catch(() => undefined)

        throw error

    }

}


export async function deleteCoverHandler(
    request: FastifyRequest<{ Params: EventIdParams }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const storageName = await removeEventCover(
        request.server.prisma,
        request.currentUser!.id,
        request.params.eventId
    )


    try {

        await deleteCoverFile(storageName)

    } catch (error) {

        request.log.error(
            error,
            'Could not remove deleted cover file'
        )

    }


    return reply.code(204).send()

}


export async function downloadCoverHandler(
    request: FastifyRequest<{ Params: EventIdParams }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    // Cover downloads are public for published events. For a draft, a valid
    // token belonging to the organiser is required. An invalid token is simply
    // ignored so the gallery never breaks for anonymous visitors.
    let viewerId: number | null = null

    const authorization = request.headers.authorization


    if (authorization?.startsWith('Bearer ')) {

        try {

            await request.jwtVerify()

            const subject = request.user.sub

            if (/^[1-9]\d*$/.test(subject)) {
                viewerId = Number(subject)
            }

        } catch {

            viewerId = null

        }

    }


    const metadata = await getCoverMetadata(
        request.server.prisma,
        request.params.eventId,
        viewerId
    )

    const filePath = coverPathFor(
        metadata.storageName
    )


    try {

        await stat(filePath)

    } catch {

        throw ApiError.notFound(
            'Cover image not found.'
        )

    }


    const fileStream = createReadStream(filePath)


    return reply
        .header(
            'Content-Type',
            metadata.mimeType
        )
        .header(
            'Content-Disposition',
            'inline; filename="cover"'
        )
        .header(
            'X-Content-Type-Options',
            'nosniff'
        )
        .header(
            'Cache-Control',
            metadata.isPrivate
                ? 'private, no-store'
                : 'public, max-age=60'
        )
        .send(fileStream)

}
