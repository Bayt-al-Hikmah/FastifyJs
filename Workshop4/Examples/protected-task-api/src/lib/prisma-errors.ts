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
