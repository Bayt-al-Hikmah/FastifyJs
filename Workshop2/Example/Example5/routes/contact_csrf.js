module.exports = async (fastify, opts) => {
  const contactSchema = {
    body: {
      type: 'object',
      required: ['name', 'message', '_csrf'],
      properties: {
        name: { type: 'string', minLength: 3, maxLength: 25 },
        message: { type: 'string', maxLength: 200 },
        _csrf: { type: 'string' }
      }
    }
  }

  fastify.get('/contact_csrf', async (request, reply) => {
    const token = await reply.generateCsrf()
    return reply.view('contact_csrf', { csrfToken: token })
  })

  fastify.post('/contact_csrf', { schema: contactSchema }, async (request, reply) => {
    const { name, message } = request.body
    fastify.log.info(`Received from ${name}: ${message}`)
    const token = await reply.generateCsrf()
    return reply.view('contact_csrf', { submittedName: name, csrfToken: token })
  })
}