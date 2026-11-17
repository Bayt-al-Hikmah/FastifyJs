import 'dotenv/config'


function requireEnv(name: string): string {

    const value = process.env[name]

    if (!value || value.trim() === '') {
        throw new Error(`${name} is required`)
    }

    return value

}


const jwtSecret = requireEnv('JWT_SECRET')


if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be at least 32 bytes long')
}


const frontendOriginValue = process.env.FRONTEND_ORIGIN?.trim()


export const env = {

    databaseUrl: requireEnv('DATABASE_URL'),

    jwtSecret,

    frontendOrigin: frontendOriginValue
        ? frontendOriginValue
        : null,

    host: process.env.HOST?.trim() || '127.0.0.1',

    port: Number(process.env.PORT ?? 3000),

    nodeEnv: process.env.NODE_ENV?.trim() || 'development',

    accessTokenTtlSeconds: 15 * 60,

    jwtIssuer: 'community-events-api'

} as const
