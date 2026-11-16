import { buildApp } from './app.js'

const start = async (): Promise<void> => {
    const fastify = buildApp()

    const host = process.env.HOST ?? '127.0.0.1'
    const port = Number(process.env.PORT ?? 3000)

    try {
        await fastify.listen({ host, port })
        fastify.log.info(`Server running at http://${host}:${port}`)
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

void start()
