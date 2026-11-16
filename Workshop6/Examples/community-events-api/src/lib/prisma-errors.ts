export function isPrismaError(
    error: unknown,
    codes: readonly string[]
): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const candidate = error as {
        name?: unknown;
        code?: unknown;
    };

    return (
        typeof candidate.name === "string" &&
        candidate.name.includes("PrismaClientKnownRequestError") &&
        typeof candidate.code === "string" &&
        codes.includes(candidate.code)
    );
}
