import { buildApp } from './app.js'

import {
    HOST,
    PORT
} from './config.js'


const app = buildApp()


try {

    await app.listen({

        host: HOST,

        port: PORT

    })

} catch (error) {

    app.log.error(error)

    process.exit(1)

}
