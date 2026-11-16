import type { FastifyPluginAsync } from "fastify";
import {
    handleCreateEvent,
    handleDeleteCover,
    handleDeleteEvent,
    handleGetCover,
    handleGetEvent,
    handleListEvents,
    handleListMyEvents,
    handleUpdateEvent,
    handleUploadCover
} from "../controllers/event-controller.js";
import {
    handleCancelRegistration,
    handleListEventRegistrations,
    handleListMyRegistrations,
    handleRegisterForEvent
} from "../controllers/registration-controller.js";
import {
    createEventBodySchema,
    eventListQuerySchema,
    myEventListQuerySchema,
    updateEventBodySchema,
    type CreateEventBody,
    type EventListQuery,
    type MyEventListQuery,
    type UpdateEventBody
} from "../schemas/event-schemas.js";
import {
    registrationListQuerySchema,
    type RegistrationListQuery
} from "../schemas/registration-schemas.js";

const idParamsSchema = {
    type: "object",
    required: ["id"],
    properties: {
        id: {
            type: "integer",
            minimum: 1
        }
    }
} as const;

type IdParam = {
    id: number;
};

const eventRoutes: FastifyPluginAsync = async (fastify) => {
    // 1. List published events (Public)
    fastify.get<{ Querystring: EventListQuery }>(
        "/events",
        {
            schema: {
                querystring: eventListQuerySchema
            }
        },
        handleListEvents
    );

    // 2. List events organized by current user (Authenticated)
    fastify.get<{ Querystring: MyEventListQuery }>(
        "/events/me",
        {
            preHandler: [fastify.authenticate],
            schema: {
                querystring: myEventListQuerySchema
            }
        },
        handleListMyEvents
    );

    // 3. Get single event by id (Public for published; Auth check for draft)
    fastify.get<{ Params: IdParam }>(
        "/events/:id",
        {
            schema: {
                params: idParamsSchema
            }
        },
        handleGetEvent
    );

    // 4. Create new event (Authenticated)
    fastify.post<{ Body: CreateEventBody }>(
        "/events",
        {
            preHandler: [fastify.authenticate],
            schema: {
                body: createEventBodySchema
            }
        },
        handleCreateEvent
    );

    // 5. Update existing event (Authenticated owner or admin)
    fastify.patch<{ Params: IdParam; Body: UpdateEventBody }>(
        "/events/:id",
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: idParamsSchema,
                body: updateEventBodySchema
            }
        },
        handleUpdateEvent
    );

    // 6. Delete event (Authenticated owner or admin)
    fastify.delete<{ Params: IdParam }>(
        "/events/:id",
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: idParamsSchema
            }
        },
        handleDeleteEvent
    );

    // 7. Upload cover image (Authenticated owner or admin)
    fastify.post<{ Params: IdParam }>(
        "/events/:id/cover",
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: idParamsSchema
            }
        },
        handleUploadCover
    );

    // 8. Serve cover image (Public)
    fastify.get<{ Params: IdParam }>(
        "/events/:id/cover",
        {
            schema: {
                params: idParamsSchema
            }
        },
        handleGetCover
    );

    // 9. Delete cover image (Authenticated owner or admin)
    fastify.delete<{ Params: IdParam }>(
        "/events/:id/cover",
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: idParamsSchema
            }
        },
        handleDeleteCover
    );

    // 10. Register for event (Authenticated)
    fastify.post<{ Params: IdParam }>(
        "/events/:id/registrations",
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: idParamsSchema
            }
        },
        handleRegisterForEvent
    );

    // 11. Cancel registration (Authenticated)
    fastify.delete<{ Params: IdParam }>(
        "/events/:id/registrations",
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: idParamsSchema
            }
        },
        handleCancelRegistration
    );

    // 12. List attendees for event (Authenticated organizer or admin)
    fastify.get<{ Params: IdParam; Querystring: RegistrationListQuery }>(
        "/events/:id/registrations",
        {
            preHandler: [fastify.authenticate],
            schema: {
                params: idParamsSchema,
                querystring: registrationListQuerySchema
            }
        },
        handleListEventRegistrations
    );

    // 13. List registrations for current user (Authenticated)
    fastify.get<{ Querystring: RegistrationListQuery }>(
        "/me/registrations",
        {
            preHandler: [fastify.authenticate],
            schema: {
                querystring: registrationListQuerySchema
            }
        },
        handleListMyRegistrations
    );
};

export default eventRoutes;
