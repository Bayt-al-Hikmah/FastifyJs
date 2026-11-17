import fp from 'fastify-plugin'
import fastifyMultipart from '@fastify/multipart'

import {
    MAX_ATTACHMENT_SIZE,
    MAX_FILES_PER_REQUEST
} from '../config/uploads.js'

import type { FastifyPluginAsync } from 'fastify'


/**
 * Multipart limits are the first line of defence. Route validation repeats
 * the size and type checks because multipart headers are untrusted.
 */

const multipartPlugin: FastifyPluginAsync = async (fastify) => {

    await fastify.register(fastifyMultipart, {

        throwFileSizeLimit: false,

        limits: {

            fieldNameSize: 100,

            fieldSize: 1024,

            fields: 0,

            files: MAX_FILES_PER_REQUEST,

            fileSize: MAX_ATTACHMENT_SIZE,

            headerPairs: 100,

            parts: MAX_FILES_PER_REQUEST

        }

    })

}


export default fp(multipartPlugin, {

    name: 'multipart'

})
