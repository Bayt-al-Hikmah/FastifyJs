import type {
    FastifyReply,
    FastifyRequest
} from 'fastify'

import {
    cancelRegistration,
    listMyRegistrations,
    registerForEvent
} from '../services/registration-service.js'


type EventIdParams = {

    eventId: number

}


export async function registerForEventHandler(
    request: FastifyRequest<{ Params: EventIdParams }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const registration = await registerForEvent(
        request.server.prisma,
        request.currentUser!.id,
        request.params.eventId
    )

    return reply.code(201).send({

        message: 'Registration successful.',

        data: {
            registration
        }

    })

}


export async function cancelRegistrationHandler(
    request: FastifyRequest<{ Params: EventIdParams }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    await cancelRegistration(
        request.server.prisma,
        request.currentUser!.id,
        request.params.eventId
    )

    return reply.code(204).send()

}


export async function listMyRegistrationsHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<FastifyReply> {

    const registrations = await listMyRegistrations(
        request.server.prisma,
        request.currentUser!.id
    )

    return reply.code(200).send({

        message: 'Your registrations retrieved successfully.',

        data: {
            registrations
        }

    })

}
