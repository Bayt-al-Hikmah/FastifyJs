import path from "node:path";

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
    const source =
        value ?? "http://127.0.0.1:3001,http://localhost:3001";

    return source
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}

function requireString(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`${name} is required.`);
    }

    return value;
}

function requireJwtSecret(): string {
    const secret = requireString("JWT_SECRET");

    if (Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error("JWT_SECRET must contain at least 32 bytes.");
    }

    return secret;
}

export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    isProduction: process.env.NODE_ENV === "production",
    port: parsePort(process.env.PORT, 3000),
    host: process.env.HOST ?? "127.0.0.1",
    databaseUrl: requireString("DATABASE_URL"),
    jwtSecret: requireJwtSecret(),
    frontendOrigins: parseOrigins(process.env.FRONTEND_ORIGIN),
    storageDirectory: path.resolve(
        process.env.STORAGE_DIR ?? "storage/event-covers"
    ),
    accessTokenExpiresIn: 900,
    maxCoverBytes: 5 * 1024 * 1024
} as const;
