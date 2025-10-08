module.exports = async (fastify, opts) => {
  fastify.get('/profile', await fastify.loginRequired(async (request, reply) => {
  const user = request.session.get('user')
  return reply.view('profile', { username:user })
}))
}