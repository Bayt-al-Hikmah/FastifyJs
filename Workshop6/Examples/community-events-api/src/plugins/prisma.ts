import fp from 'fastify-plugin'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client.js'

import { env } from '../config/env.js'

import type { FastifyPluginAsync } from 'fastify'


const prismaPlugin: FastifyPluginAsync = async (fastify) => {

    const adapter = new PrismaPg({
        connectionString: env.databaseUrl
    })

    const prisma = new PrismaClient({
        adapter
    })

    await prisma.$connect()

    fastify.decorate('prisma', prisma)

    fastify.addHook('onClose', async (instance) => {

        await instance.prisma.$disconnect()

    })

}


export default fp(prismaPlugin, {

    name: 'prisma'

})
