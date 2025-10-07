const fastify = require('fastify')({ logger: true })

fastify.get('/', async (request, reply) => {
  return 'Hello, World!'
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server running at http://127.0.0.1:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()