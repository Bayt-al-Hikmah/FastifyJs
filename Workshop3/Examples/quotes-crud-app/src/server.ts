import 'dotenv/config'

import { buildApp } from './app.js'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '127.0.0.1'

const app = buildApp()

async function start(): Promise<void> {
    try {
        await app.listen({
            port,
            host
        })

        app.log.info(`Quote Sharing is running at http://${host}:${port}`)
    } catch (error) {
        app.log.error(error)
        process.exit(1)
    }
}

async function shutdown(signal: string): Promise<void> {
    app.log.info(`Received ${signal}. Shutting down.`)

    try {
        await app.close()
        process.exit(0)
    } catch (error) {
        app.log.error(error)
        process.exit(1)
    }
}

process.on('SIGINT', () => {
    void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
})

await start()
