import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'

import { MAX_COVER_SIZE } from '../lib/media-storage.js'

import type { FastifyPluginAsync } from 'fastify'


/**
 * A cover upload is exactly one file. The tight multipart limits are the
 * first line of defence; media-storage.ts repeats the signature and size
 * checks because multipart headers are untrusted.
 */
const multipartPlugin: FastifyPluginAsync = async (fastify) => {

    await fastify.register(multipart, {

        throwFileSizeLimit: false,

        limits: {
            fieldNameSize: 100,
            fieldSize: 1024,
            fields: 0,
            files: 1,
            fileSize: MAX_COVER_SIZE,
            headerPairs: 100,
            parts: 1
        }

    })

}


export default fp(multipartPlugin, {

    name: 'multipart'

})
