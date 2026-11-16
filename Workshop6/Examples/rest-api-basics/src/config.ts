import "dotenv/config";

function parsePort(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback;
    }

    const port = Number(value);

    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error(`Invalid PORT value: ${value}`);
    }

    return port;
}

function parseOrigins(value: string | undefined): string[] {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}

export const config = {
    port: parsePort(process.env.PORT, 3010),
    host: process.env.HOST ?? "127.0.0.1",
    frontendOrigins: parseOrigins(process.env.FRONTEND_ORIGIN),
    isProduction: process.env.NODE_ENV === "production"
} as const;
