import { buildApp } from './app.js'


const start = async (): Promise<void> => {

    const fastify = buildApp()

    let closing = false


    const shutdown = async (signal: string): Promise<void> => {

        if (closing) {
            return
        }

        closing = true

        fastify.log.info(`Received ${signal}; shutting down gracefully`)

        try {

            await fastify.close()

            process.exit(0)

        } catch (error) {

            fastify.log.error(error)

            process.exit(1)

        }

    }


    process.on('SIGINT', () => {

        void shutdown('SIGINT')

    })

    process.on('SIGTERM', () => {

        void shutdown('SIGTERM')

    })


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
