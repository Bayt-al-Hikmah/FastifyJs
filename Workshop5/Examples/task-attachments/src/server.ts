import 'dotenv/config'

import { buildApp } from './app.js'


const start = async (): Promise<void> => {

    const fastify = buildApp()


    const port = Number(process.env.PORT ?? 3000)

    const host = process.env.HOST ?? '127.0.0.1'


    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error('PORT must be a valid TCP port')
    }


    try {

        const address = await fastify.listen({
            port,
            host
        })


        fastify.log.info(`Server listening at ${address}`)
        fastify.log.info(`Dashboard available at ${address}/app/`)

    } catch (error) {

        fastify.log.error(error)

        process.exit(1)

    }

}


const shutdown = async (signal: string): Promise<void> => {

    process.stdout.write(`\n${signal} received. Shutting down.\n`)

    process.exit(0)

}


process.on('SIGINT', () => {

    void shutdown('SIGINT')

})

process.on('SIGTERM', () => {

    void shutdown('SIGTERM')

})


void start()
