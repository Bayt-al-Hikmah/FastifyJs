const fp = require('fastify-plugin')
const MarkdownIt = require('markdown-it')

module.exports = fp(async (fastify, opts) => {
  const md = new MarkdownIt({
    html: false,
    breaks: true
  })

  // Expose markdown-it instance on fastify
  fastify.decorate('markdown', md)
})
