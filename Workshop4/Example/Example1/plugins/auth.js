const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
  fastify.decorate('loginRequired', async (handler) => {
    return async (request, reply) => {
      if (!request.session.get('user')) {
        request.flash('danger', 'You must log in to access this page.')
        return reply.redirect('/login')
      }
      return handler(request, reply)
    }
  })
})