import { randomBytes } from "node:crypto";

import type { PrismaClient } from "../generated/prisma/client.js";

import { ApiError } from "../lib/api-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { isPrismaError } from "../lib/prisma-errors.js";
import { publicUserSelect } from "../lib/serializers.js";
import type { RegisterBody } from "../schemas/auth-schemas.js";

const dummyPasswordHash = hashPassword(
    randomBytes(32).toString("hex")
);

export async function registerUser(
    prisma: PrismaClient,
    input: RegisterBody
) {
    const passwordHash = await hashPassword(input.password);

    try {
        return await prisma.user.create({
            data: {
                username: input.username,
                email: input.email,
                passwordHash
            },
            select: publicUserSelect
        });
    } catch (error) {
        if (isPrismaError(error, ["P2002"])) {
            throw ApiError.conflict(
                "An account with this email or username already exists.",
                [
                    {
                        field: "email",
                        message:
                            "Choose a different email address or username."
                    }
                ]
            );
        }

        throw error;
    }
}

export async function authenticateCredentials(
    prisma: PrismaClient,
    email: string,
    password: string
) {
    const user = await prisma.user.findUnique({
        where: {
            email
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            createdAt: true,
            passwordHash: true
        }
    });

    const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
    const passwordValid = await verifyPassword(passwordHash, password);

    if (!user || !passwordValid) {
        throw ApiError.unauthorized("Invalid email or password.");
    }

    return user;
}
