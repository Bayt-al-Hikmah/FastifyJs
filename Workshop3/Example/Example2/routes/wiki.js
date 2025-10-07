module.exports = async (fastify, opts) => {
  function collectMessages(reply) {
    const categories = ['danger', 'success', 'info']
    const messages = []

    for (const category of categories) {
      const msgs = reply.flash(category) || []
      for (const msg of msgs) {
        messages.push({ category, message: msg })
      }
    }

    return messages
  }

  fastify.get('/wiki/:page_name', async (request, reply) => {
    const { page_name } = request.params
    const page = fastify.dataStore.pages[page_name]
    messages = collectMessages(reply)
    if (!page) {
      return reply.view('404', { messages: messages })
    }
    page.html_content = fastify.markdown.render(page.content)
    return reply.view('wiki_page', { page, page_name })
  })

  fastify.get('/create', async (request, reply) => {
    messages = collectMessages(reply)
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to create a page.')
      return reply.redirect('/login')
    }
    return reply.view('create_page', { messages: messages })
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