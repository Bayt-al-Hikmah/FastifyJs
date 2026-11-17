import 'dotenv/config'

import { buildApp } from './app.js'

import { HOST, PORT } from './config/env.js'


const start = async (): Promise<void> => {

    const fastify = buildApp()


    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65_535) {

        throw new Error('PORT must be a valid TCP port')

    }


    try {

        const address = await fastify.listen({
            port: PORT,
            host: HOST
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
