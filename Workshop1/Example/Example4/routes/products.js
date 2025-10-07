module.exports = async (fastify, opts) => {
  const productsDb = {
    '100': { name: 'Laptop', price: 1200 },
    '101': { name: 'Mouse', price: 25 },
    '102': { name: 'Keyboard', price: 75 }
  }

  fastify.get('/products/:productId', async (request, reply) => {
    const { productId } = request.params
    const { currency = 'USD' } = request.query // Default to 'USD'

    const product = productsDb[productId]
    if (!product) {
      reply.code(404).send({ error: 'Product not found' })
      return
    }

    const responseData = {
      id: productId,
      name: product.name,
      price: product.price,
      currency
    }

    return responseData
  })
}