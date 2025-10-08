const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/cookie'))
  fastify.register(require('@fastify/session'), {
    secret: 'c88bb69cca16b53452cf666476f6c6022c87f4f437c74de68d81c63a', // change in production
    cookie: {
      secure: false,       // true in production with HTTPS
      httpOnly: true,      // prevents access via client-side JS
      sameSite: 'lax',     // helps prevent CSRF
      maxAge: 15 * 60 * 1000 // 15 minutes in milliseconds
    },
    saveUninitialized: false
  })
  fastify.register(require('@fastify/flash'))
})