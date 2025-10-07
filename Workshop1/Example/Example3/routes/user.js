module.exports = async (fastify, opts) => {
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
}