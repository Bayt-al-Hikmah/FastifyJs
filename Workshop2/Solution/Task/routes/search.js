module.exports = async (fastify, opts) => {

  const searchSchema = {
    body: {
      type: 'object',
      required: ['author', '_csrf'],
      properties: {
        author: { type: 'string', minLength: 3, maxLength: 25 },
        _csrf: { type: 'string' }
      }
    }
  }

  fastify.get('/search', async (request, reply) => {
    const token = await reply.generateCsrf()
    return reply.view('search', { csrfToken: token })
  })

  fastify.post('/search', { schema: searchSchema }, async (request, reply) => {
    const {author} = request.body
    Quotes = fastify.QuotesDB.filter(quote => quote.author.toLowerCase() === author.toLowerCase());
    const token = await reply.generateCsrf()
    return reply.view('search', { Quotes:Quotes,csrfToken: token})
  })
}
