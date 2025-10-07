const collectMessages = require('../utils')
module.exports = async (fastify, opts) => {
  const createSchema = {
    body: {
      type: 'object',
      required: ['title', 'content'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 50 },
        content: { type: 'string', minLength: 1 }
      }
    }
  }

  fastify.get('/wiki/:page_name', async (request, reply) => {
    const { page_name } = request.params
    const page = fastify.dataStore.pages[page_name]
    messages = collectMessages(reply)
    if (!page) {
      return reply.view('404', { messages: messages })
    }
    page.html_content = page.content
    return reply.view('wiki_page', { page, page_name })
  })

  fastify.get('/create', async (request, reply) => {
    messages = collectMessages(reply)
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to create a page.')
      return reply.redirect('/login')
    }
    return reply.view('create_page', { messages: messages ,quillConfig: JSON.stringify(fastify.quillConfig) })
  })

  fastify.post('/create', async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to create a page.')
      return reply.redirect('/login')
    }
    const { title, content } = request.body
    fastify.dataStore.pages[title] = { content, author: request.session.get('username') }
    return reply.redirect(`/wiki/${title}`)
  })
}