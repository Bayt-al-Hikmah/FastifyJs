const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/cookie'))
  fastify.register(require('@fastify/session'), {
    secret: 'c88bb69cca16b53452cf666476f6c6022c87f4f437c74de68d81c63a',
    cookie: { secure: false } // Set secure: true in production with HTTPS
  })
  fastify.register(require('@fastify/flash'))
})