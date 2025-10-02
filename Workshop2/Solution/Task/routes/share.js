module.exports = async (fastify, opts) => {
  const shareSchema = {
    body: {
      type: 'object',
      required: ['author', 'quote', '_csrf'],
      properties: {
        author: { type: 'string', minLength: 3, maxLength: 25 },
        quote: { type: 'string', minLength: 20, maxLength: 300 },
        _csrf: { type: 'string' }
      }
    }
  }

  fastify.get('/share', async (request, reply) => {
    const token = await reply.generateCsrf()
    fastify.log.warn("aaaaaaaaa")
    return reply.view('share', { csrfToken: token })
  })

  fastify.post('/share', { schema: shareSchema }, async (request, reply) => {
    const {author, quote } = request.body
    console.log(author)
    fastify.QuotesDB.push({ author, quote });
    fastify.log.info(`New quote added by ${author}`);
    return reply.redirect('/');
  })
}