import fp from 'fastify-plugin'

import { PitchStore } from '../lib/pitch-store.js'

import type { FastifyPluginAsync } from 'fastify'


declare module 'fastify' {

    interface FastifyInstance {

        pitchStore: PitchStore

    }

}


const pitchStorePlugin: FastifyPluginAsync = async (fastify) => {

    fastify.decorate('pitchStore', new PitchStore())

}


export default fp(pitchStorePlugin)
