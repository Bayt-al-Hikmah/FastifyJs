import fp from 'fastify-plugin'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client.js'

import type { FastifyPluginAsync } from 'fastify'


const prismaPlugin: FastifyPluginAsync = async (fastify) => {

    const connectionString = process.env.DATABASE_URL


    if (!connectionString) {

        throw new Error('DATABASE_URL is required')

    }


    const adapter = new PrismaPg({
        connectionString
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
