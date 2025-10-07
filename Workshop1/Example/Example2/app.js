const fastify = require('fastify')({ logger: true })

fastify.get('/', async (request, reply) => {
  return 'Hello, World!'
})
fastify.get('/user/:username', async (request, reply) => {
  const { username } = request.params
  return `Hello, ${username}!`
})
fastify.get('/search', async (request, reply) => {
  const { query } = request.query
  if (query) {
    return `You are searching for: ${query}`
  }
  return 'Please provide a search query.'
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