module.exports = async (fastify, opts) => {
  fastify.get('/dashboard/:status', async (request, reply) => {
    const { status } = request.params
    return reply.view('dashboard', { userStatus: status })
  })
}