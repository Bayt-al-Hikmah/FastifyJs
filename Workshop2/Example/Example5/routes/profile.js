module.exports = async (fastify, opts) => {
  fastify.get('/profile/:name', async (request, reply) => {
    const { name } = request.params
    const userDetails = {
      username: name,
      bio: 'Loves coding in JavaScript and exploring new technologies.',
      shoppingList: ['Apples', 'Oranges', 'Bananas']
    }
    return reply.view('profile', { user: userDetails })
  })
}