import { buildApp } from './app.js'

const start = async (): Promise<void> => {
    const fastify = buildApp()

    const port = Number(process.env.PORT ?? 3000)

    try {
        const address = await fastify.listen({
            port,
            host: '127.0.0.1'
        })

        fastify.log.info(`File Cabinet listening at ${address}`)
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

void start()
