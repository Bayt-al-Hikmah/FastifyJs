const fp = require('fastify-plugin')
const path = require('path')

module.exports = fp(async (fastify, opts) => {
  // Serve Quill.js static assets
  fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../../node_modules/quill/dist'),
    prefix: '/quill/',
    decorateReply: false // Avoid conflicts with other static routes
  })

  // Decorate Fastify with Quill configuration
  fastify.decorate('quillConfig', {
    modules: {
      toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        ['link', 'blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['clean']
      ]
    },
    theme: 'snow'
  })
})