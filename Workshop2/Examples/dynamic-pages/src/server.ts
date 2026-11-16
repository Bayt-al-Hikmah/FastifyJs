import { buildApp } from './app.js'

const start = async (): Promise<void> => {
    const fastify = buildApp()

    try {
        const address = await fastify.listen({
            port: 3000,
            host: '127.0.0.1'
        })

        fastify.log.info(`Server listening at ${address}`)
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

void start()
