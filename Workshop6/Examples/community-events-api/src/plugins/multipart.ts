import multipart from "@fastify/multipart";
import fp from "fastify-plugin";

import type { FastifyPluginAsync } from "fastify";

import { env } from "../config/env.js";

const multipartPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(multipart, {
        throwFileSizeLimit: true,
        limits: {
            fileSize: env.maxCoverBytes,
            files: 1,
            fields: 0,
            parts: 1
        }
    });
};

export default fp(multipartPlugin, {
    name: "multipart"
});
