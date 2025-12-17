const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN

})

fastify.register(require('@fastify/cookie'))
})