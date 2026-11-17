import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest
} from 'fastify'

import type { PrismaClient } from '../generated/prisma/client.js'

import type {
    AuthenticatedUser,
    UserRole
} from './auth.js'


declare module 'fastify' {

    interface FastifyRequest {

        currentUser: AuthenticatedUser | null

        /**
         * Set by requireEventOwner after an ownership check. Downstream
         * handlers can rely on the fact that the signed-in user owns the
         * event identified by this id.
         */
        eventOwnershipId?: number

    }

    interface FastifyInstance {

        prisma: PrismaClient

        authenticate: (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>

        authorize: (
            ...roles: UserRole[]
        ) => (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>

    }

}
