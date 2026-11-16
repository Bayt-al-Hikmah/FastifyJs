import fp from 'fastify-plugin'

import type { FastifyPluginAsync } from 'fastify'

import { createScanner } from '../lib/scanner.js'


const scannerPlugin: FastifyPluginAsync = async (fastify) => {

    const scanner = createScanner()

    fastify.decorate('scanner', scanner)

    fastify.log.info({

        scanner: scanner.name,

        mode: scanner.mode

    }, 'Malware scanner configured')

}


export default fp(scannerPlugin, {

    name: 'scanner'

})
