import type {
    FastifyReply,
    FastifyRequest
} from 'fastify'

import {
    authenticateUser,
    getPublicUser,
    registerUser
} from '../services/auth-service.js'

import type {
    LoginInput,
    RegisterInput
} from '../services/auth-service.js'


export async function registerHandler(
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const user = await registerUser(
        request.server.prisma,
        request.body
    )

    return reply.code(201).send({

        message: 'Account created successfully.',

        data: {
            user
        }

    })

}


export async function loginHandler(
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {

    const result = await authenticateUser(
        request.server.prisma,
        request.body,
        (subject) => reply.jwtSign({
            sub: subject
        })
    )

    return reply.code(200).send({

        message: 'Login successful.',

        data: result

    })

}


export async function meHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<FastifyReply> {

    const user = await getPublicUser(
        request.server.prisma,
        request.currentUser!.id
    )

    return reply.code(200).send({

        message: 'Current user retrieved successfully.',

        data: {
            user
        }

    })

}
