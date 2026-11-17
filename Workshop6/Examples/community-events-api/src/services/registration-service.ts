import type { PrismaClient } from '../generated/prisma/client.js'

import { ApiError } from '../lib/api-error.js'
import { isUniqueConstraintError } from '../lib/prisma-errors.js'
import {
    registrationSelect,
    serializeRegistration
} from '../lib/serializers.js'

import type {
    RegistrationRow,
    RegistrationSummary
} from '../lib/serializers.js'


export type RegistrationResult = {

    eventId: number

    registeredAt: string

    registeredCount: number

}


export async function registerForEvent(
    prisma: PrismaClient,
    userId: number,
    eventId: number
): Promise<RegistrationResult> {

    try {

        return await prisma.$transaction(async (tx) => {

            const event = await tx.event.findFirst({

                where: {
                    id: eventId,
                    status: 'PUBLISHED'
                },

                select: {
                    id: true,
                    capacity: true,
                    registeredCount: true
                }

            })


            if (!event) {

                throw ApiError.notFound(
                    'Event not found.'
                )

            }


            // The conditional update is the capacity guard: it increments the
            // counter only while a place is still available, so two concurrent
            // requests can never both claim the final seat.
            const claim = await tx.event.updateMany({

                where: {
                    id: eventId,
                    registeredCount: {
                        lt: event.capacity
                    }
                },

                data: {
                    registeredCount: {
                        increment: 1
                    }
                }

            })


            if (claim.count === 0) {

                throw ApiError.conflict(
                    'This event is fully booked.'
                )

            }


            const registration =
                await tx.eventRegistration.create({

                    data: {
                        userId,
                        eventId
                    }

                })


            return {

                eventId: registration.eventId,

                registeredAt:
                    registration.registeredAt.toISOString(),

                registeredCount: event.registeredCount + 1

            }

        })

    } catch (error) {

        if (isUniqueConstraintError(error)) {

            throw ApiError.conflict(
                'You are already registered for this event.'
            )

        }

        throw error

    }

}


export async function cancelRegistration(
    prisma: PrismaClient,
    userId: number,
    eventId: number
): Promise<void> {

    await prisma.$transaction(async (tx) => {

        const registration =
            await tx.eventRegistration.findUnique({

                where: {
                    userId_eventId: {
                        userId,
                        eventId
                    }
                }

            })


        if (!registration) {

            throw ApiError.notFound(
                'Registration not found.'
            )

        }


        await tx.eventRegistration.delete({

            where: {
                userId_eventId: {
                    userId,
                    eventId
                }
            }

        })


        await tx.event.updateMany({

            where: {
                id: eventId,
                registeredCount: {
                    gt: 0
                }
            },

            data: {
                registeredCount: {
                    decrement: 1
                }
            }

        })

    })

}


export async function listMyRegistrations(
    prisma: PrismaClient,
    userId: number
): Promise<RegistrationSummary[]> {

    const rows = await prisma.eventRegistration.findMany({

        where: {
            userId
        },

        select: registrationSelect,

        orderBy: {
            registeredAt: 'desc'
        }

    })


    return (rows as RegistrationRow[]).map(
        serializeRegistration
    )

}
