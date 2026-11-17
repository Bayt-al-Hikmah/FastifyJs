import 'dotenv/config'

import { buildApp } from './app.js'
import { HOST, PORT } from './config.js'


/**
 * The entry point only starts the server. Keeping `buildApp()` separate means
 * the Fastify instance can be created without opening a network port.
 */

const start = async (): Promise<void> => {

    const app = buildApp()

    try {

        await app.listen({

            port: PORT,

            host: HOST

        })

    } catch (error) {

        app.log.error(error)

        process.exit(1)

    }

}

start()
