import { PrismaPg } from "@prisma/adapter-pg";
import fp from "fastify-plugin";

import type { FastifyPluginAsync } from "fastify";

import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
    const adapter = new PrismaPg({
        connectionString: env.databaseUrl
    });

    const prisma = new PrismaClient({
        adapter
    });

    await prisma.$connect();

    fastify.decorate("prisma", prisma);

    fastify.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
};

export default fp(prismaPlugin, {
    name: "prisma"
});
