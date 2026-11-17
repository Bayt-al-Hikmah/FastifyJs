import type { FastifyPluginAsync } from 'fastify'

import {
    createEventHandler,
    deleteCoverHandler,
    deleteEventHandler,
    downloadCoverHandler,
    getEvent,
    listCurrentUserEvents,
    listEvents,
    requireEventOwner,
    updateEventHandler,
    uploadCoverHandler
} from '../controllers/event-controller.js'

import {
    cancelRegistrationHandler,
    listMyRegistrationsHandler,
    registerForEventHandler
} from '../controllers/registration-controller.js'

import { idParamSchema } from '../schemas/common-schemas.js'

import {
    createEventBodySchema,
    listEventsQuerySchema,
    myEventsQuerySchema,
    updateEventBodySchema
} from '../schemas/event-schemas.js'

import { myRegistrationsQuerySchema } from '../schemas/registration-schemas.js'

import type {
    CreateEventInput,
    ListMyEventsQuery,
    UpdateEventInput
} from '../services/event-service.js'

import type { EventCategoryValue } from '../lib/serializers.js'


type EventIdParams = {

    eventId: number

}


type PublicEventsQuery = {

    search?: string

    category?: EventCategoryValue

    page?: number

    limit?: number

}


type MyEventsQuery = ListMyEventsQuery


const eventRoutes: FastifyPluginAsync = async (fastify) => {

    // ------------------------------------------------------------------
    // Public collection and detail
    // ------------------------------------------------------------------

    fastify.get<{ Querystring: PublicEventsQuery }>(
        '/events',

        {
            schema: {
                querystring: listEventsQuerySchema
            },

            preValidation: async (request) => {

                const query = request.query


                if (typeof query?.search === 'string') {
                    query.search = query.search.trim()
                }

            }

        },

        listEvents
    )


    fastify.get<{ Params: EventIdParams }>(
        '/events/:eventId',

        {
            schema: {
                params: idParamSchema
            }
        },

        getEvent
    )


    fastify.get<{ Params: EventIdParams }>(
        '/events/:eventId/cover',

        {
            schema: {
                params: idParamSchema
            }
        },

        downloadCoverHandler
    )


    // ------------------------------------------------------------------
    // Organiser collection and mutations
    // ------------------------------------------------------------------

    fastify.get<{ Querystring: MyEventsQuery }>(
        '/me/events',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                querystring: myEventsQuerySchema
            }
        },

        listCurrentUserEvents
    )


    fastify.post<{ Body: CreateEventInput }>(
        '/events',

        {
            preHandler: [
                fastify.authenticate,
                fastify.authorize('ORGANIZER')
            ],

            schema: {
                body: createEventBodySchema
            },

            preValidation: async (request) => {

                const body = request.body


                if (typeof body?.title === 'string') {
                    body.title = body.title.trim()
                }

                if (typeof body?.description === 'string') {
                    body.description = body.description.trim()
                }

                if (typeof body?.location === 'string') {
                    body.location = body.location.trim()
                }

            }

        },

        createEventHandler
    )


    fastify.patch<{
        Params: EventIdParams
        Body: UpdateEventInput
    }>(
        '/events/:eventId',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: idParamSchema,
                body: updateEventBodySchema
            },

            preValidation: async (request) => {

                const body = request.body


                if (typeof body?.title === 'string') {
                    body.title = body.title.trim()
                }

                if (typeof body?.description === 'string') {
                    body.description = body.description.trim()
                }

                if (typeof body?.location === 'string') {
                    body.location = body.location.trim()
                }

            }

        },

        updateEventHandler
    )


    fastify.delete<{ Params: EventIdParams }>(
        '/events/:eventId',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: idParamSchema
            }
        },

        deleteEventHandler
    )


    // ------------------------------------------------------------------
    // Private cover images (ownership is checked before reading the file)
    // ------------------------------------------------------------------

    fastify.put<{ Params: EventIdParams }>(
        '/events/:eventId/cover',

        {
            preHandler: [
                fastify.authenticate,
                requireEventOwner
            ],

            schema: {
                params: idParamSchema
            }
        },

        uploadCoverHandler
    )


    fastify.delete<{ Params: EventIdParams }>(
        '/events/:eventId/cover',

        {
            preHandler: [
                fastify.authenticate,
                requireEventOwner
            ],

            schema: {
                params: idParamSchema
            }
        },

        deleteCoverHandler
    )


    // ------------------------------------------------------------------
    // Registrations
    // ------------------------------------------------------------------

    fastify.post<{ Params: EventIdParams }>(
        '/events/:eventId/registrations',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: idParamSchema
            }
        },

        registerForEventHandler
    )


    fastify.delete<{ Params: EventIdParams }>(
        '/events/:eventId/registrations/me',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                params: idParamSchema
            }
        },

        cancelRegistrationHandler
    )


    fastify.get(
        '/me/registrations',

        {
            preHandler: [
                fastify.authenticate
            ],

            schema: {
                querystring: myRegistrationsQuerySchema
            }
        },

        listMyRegistrationsHandler
    )

}


export default eventRoutes
