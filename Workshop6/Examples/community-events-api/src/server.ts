import 'dotenv/config'

import { buildApp } from './app.js'
import { env } from './config/env.js'


const app = buildApp()


const start = async (): Promise<void> => {

    try {

        await app.listen({

            port: env.port,

            host: env.host

        })

    } catch (error) {

        app.log.error(error)

        process.exit(1)

    }

}


start()
