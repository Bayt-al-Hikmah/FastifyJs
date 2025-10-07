module.exports = async (fastify, opts) => {
  fastify.get('/contact', async (request, reply) => {
    return reply.view('contact')
  })

  fastify.post('/contact', async (request, reply) => {
    const { name, message } = request.body
    if (!name || !message) {
      return reply.view('contact', { error: 'Name and message are required' })
    }
    fastify.log.info(`Received message from ${name}: ${message}`)
    return reply.view('contact', { submittedName: name })
  })
}