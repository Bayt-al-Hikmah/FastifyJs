import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'

import type { FastifyPluginAsync } from 'fastify'

import { MAX_IMAGE_SIZE } from '../config/uploads.js'


/**
 * Uploads are accepted only on the image routes. The limits are the first
 * line of defence; receiveImage() repeats the size and signature checks.
 */
const multipartPlugin: FastifyPluginAsync = async (fastify) => {

    await fastify.register(multipart, {

        throwFileSizeLimit: false,

        limits: {
            fieldNameSize: 100,
            fieldSize: 1024,
            fields: 0,
            files: 1,
            fileSize: MAX_IMAGE_SIZE,
            headerPairs: 100,
            parts: 1
        }

    })

}


export default fp(multipartPlugin, {

    name: 'multipart'

})
