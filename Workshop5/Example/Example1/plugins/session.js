const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/cookie'))
  fastify.register(require('@fastify/session'), {
    secret: process.env.SECRET, 
    cookie: {
      secure: false,       
      httpOnly: true,      
      sameSite: 'lax',     
      maxAge: 15 * 60 * 1000 
    },
    saveUninitialized: false
  })
})