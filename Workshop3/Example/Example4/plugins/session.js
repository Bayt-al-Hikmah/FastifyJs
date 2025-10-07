const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/cookie'))
  fastify.register(require('@fastify/session'), {
    secret: 'your-super-secret-key-that-no-one-knows',
    cookie: { secure: false } // Set secure: true in production with HTTPS
  })
  fastify.register(require('@fastify/flash'))
})