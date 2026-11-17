import argon2 from 'argon2'


/**
 * OWASP's recommended minimum Argon2id configuration. Password hashes are
 * never returned by a serializer or included in an error response.
 */

const argon2Options = {

    type: argon2.argon2id,

    memoryCost: 19_456,

    timeCost: 2,

    parallelism: 1

} as const


export async function hashPassword(password: string): Promise<string> {

    return argon2.hash(password, argon2Options)

}


export async function verifyPassword(
    passwordHash: string,
    password: string
): Promise<boolean> {

    try {

        return await argon2.verify(passwordHash, password)

    } catch {

        return false

    }

}
