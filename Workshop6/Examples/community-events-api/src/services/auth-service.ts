import { randomBytes } from 'node:crypto'

import type { PrismaClient } from '../generated/prisma/client.js'

import { env } from '../config/env.js'

import { ApiError } from '../lib/api-error.js'
import {
    hashPassword,
    verifyPassword
} from '../lib/password.js'
import { isUniqueConstraintError } from '../lib/prisma-errors.js'
import { serializeUser } from '../lib/serializers.js'

import type {
    PublicUser,
    UserRole
} from '../types/auth.js'


export type RegisterInput = {

    username: string

    email: string

    password: string

    role: UserRole

}


export type LoginInput = {

    email: string

    password: string

}


export type LoginResult = {

    accessToken: string

    tokenType: string

    expiresIn: number

    user: PublicUser

}


const publicUserSelect = {

    id: true,

    username: true,

    email: true,

    role: true,

    createdAt: true

} as const


let dummyPasswordHash: Promise<string> | null = null


/**
 * A stable hash of a random throwaway value. It is computed once and reused so
 * a login attempt for a missing account still performs an Argon2 verification
 * (avoiding a timing signal) without hashing on every request.
 */
function getDummyPasswordHash(): Promise<string> {

    if (!dummyPasswordHash) {

        dummyPasswordHash = hashPassword(
            randomBytes(32).toString('hex')
        )

    }

    return dummyPasswordHash

}


export async function registerUser(
    prisma: PrismaClient,
    input: RegisterInput
): Promise<PublicUser> {

    const passwordHash = await hashPassword(input.password)

    try {

        const user = await prisma.user.create({

            data: {
                username: input.username,
                email: input.email,
                passwordHash,
                role: input.role
            },

            select: publicUserSelect

        })

        return serializeUser(user)

    } catch (error) {

        if (isUniqueConstraintError(error)) {

            throw ApiError.conflict(
                'An account with that email or username already exists.'
            )

        }

        throw error

    }

}


export async function authenticateUser(
    prisma: PrismaClient,
    input: LoginInput,
    signAccessToken: (subject: string) => Promise<string>
): Promise<LoginResult> {

    const user = await prisma.user.findUnique({

        where: {
            email: input.email
        }

    })


    // Verify against a dummy hash when the account does not exist so the two
    // failure paths take a comparable amount of time (no user enumeration).
    const passwordHash =
        user?.passwordHash ?? await getDummyPasswordHash()

    const passwordValid = await verifyPassword(
        passwordHash,
        input.password
    )


    if (!user || !passwordValid) {

        throw ApiError.unauthorized(
            'Invalid email or password.'
        )

    }


    const accessToken = await signAccessToken(
        String(user.id)
    )


    return {

        accessToken,

        tokenType: 'Bearer',

        expiresIn: env.accessTokenTtlSeconds,

        user: serializeUser(user)

    }

}


export async function getPublicUser(
    prisma: PrismaClient,
    userId: number
): Promise<PublicUser> {

    const user = await prisma.user.findUnique({

        where: {
            id: userId
        },

        select: publicUserSelect

    })


    if (!user) {

        throw ApiError.notFound(
            'The account no longer exists.'
        )

    }


    return serializeUser(user)

}
