import type { FastifyPluginAsync } from 'fastify'

type Item = {
    id: string
    name: string
    price: number
}

const items: Record<string, Item> = {

    '1': {
        id: '1',
        name: 'Notebook',
        price: 6.5
    },

    '2': {
        id: '2',
        name: 'Pen',
        price: 2.25
    },

    '3': {
        id: '3',
        name: 'Backpack',
        price: 48
    }

}

const itemsRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get(
        '/items',
        {
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        price: { type: 'number' }
                                    },
                                    required: ['id', 'name', 'price'],
                                    additionalProperties: false
                                }
                            },
                            count: { type: 'number' }
                        },
                        required: ['items', 'count'],
                        additionalProperties: false
                    }
                }
            }
        },
        async () => {

            const itemList = Object.values(items)

            return {
                items: itemList,
                count: itemList.length
            }

        }
    )

    fastify.get<{
        Params: {
            itemId: string
        }
    }>(
        '/items/:itemId',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        itemId: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 20
                        }
                    },
                    required: ['itemId'],
                    additionalProperties: false
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            price: { type: 'number' }
                        },
                        required: ['id', 'name', 'price'],
                        additionalProperties: false
                    },
                    404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' }
                        },
                        required: ['error'],
                        additionalProperties: false
                    }
                }
            }
        },
        async (request, reply) => {

            const item = items[request.params.itemId]

            if (!item) {

                return reply.code(404).send({
                    error: 'Item not found'
                })

            }

            return item

        }
    )

}

export default itemsRoutes
