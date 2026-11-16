import { setTimeout as delay } from 'node:timers/promises'

import type { FastifyPluginAsync } from 'fastify'

const demoRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get(
        '/demo/slow',
        {
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            waitedMs: { type: 'number' }
                        },
                        required: ['message', 'waitedMs'],
                        additionalProperties: false
                    }
                }
            }
        },
        async () => {

            const waitedMs = 120
            await delay(waitedMs)

            return {
                message: 'This handler deliberately waited before responding.',
                waitedMs
            }

        }
    )

}

export default demoRoutes
