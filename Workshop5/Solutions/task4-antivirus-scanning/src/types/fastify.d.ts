import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest
} from 'fastify'

import type { PrismaClient } from '../generated/prisma/client.js'

import type { AttachmentScanner } from '../lib/scanner.js'

import type {
    AuthenticatedUser,
    UserRole
} from './auth.js'


declare module 'fastify' {

    interface FastifyRequest {

        currentUser: AuthenticatedUser | null

    }

    interface FastifyInstance {

        prisma: PrismaClient

        scanner: AttachmentScanner

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
