export function isPrismaError(
    error: unknown,
    code: string
): boolean {

    if (typeof error !== 'object' || error === null) {
        return false
    }

    const candidate = error as {
        code?: unknown
        name?: unknown
    }

    return (
        candidate.name === 'PrismaClientKnownRequestError' &&
        candidate.code === code
    )

}


export function isUniqueConstraintError(
    error: unknown
): boolean {

    return isPrismaError(error, 'P2002')

}


export function isRecordNotFoundError(
    error: unknown
): boolean {

    return isPrismaError(error, 'P2025')

}
