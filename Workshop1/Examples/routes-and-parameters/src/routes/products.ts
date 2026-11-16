import type { FastifyPluginAsync } from 'fastify'

type Product = {
    name: string
    price: number
    inStock: boolean
}

// A fake database keeps the example focused on routing and validation.
const products: Record<string, Product> = {

    '100': {
        name: 'Laptop',
        price: 1200,
        inStock: true
    },

    '101': {
        name: 'Mouse',
        price: 25,
        inStock: true
    },

    '102': {
        name: 'Keyboard',
        price: 75,
        inStock: false
    }

}

const productsRoutes: FastifyPluginAsync = async (fastify) => {

    fastify.get<{
        Params: {
            productId: string
        }
        Querystring: {
            includeStock?: 'true' | 'false'
        }
    }>(
        '/products/:productId',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        productId: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 20
                        }
                    },
                    required: ['productId'],
                    additionalProperties: false
                },
                querystring: {
                    type: 'object',
                    properties: {
                        includeStock: {
                            type: 'string',
                            enum: ['true', 'false']
                        }
                    },
                    additionalProperties: false
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            price: { type: 'number' },
                            inStock: { type: 'boolean' }
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

            const productId = request.params.productId
            const product = products[productId]

            if (!product) {

                return reply.code(404).send({
                    error: 'Product not found'
                })

            }

            // Query parameter values arrive as strings, so compare explicitly.
            const includeStock = request.query.includeStock === 'true'

            const responseData = {
                id: productId,
                name: product.name,
                price: product.price,

                ...(includeStock
                    ? { inStock: product.inStock }
                    : {})

            }

            return responseData

        }
    )

}

export default productsRoutes
