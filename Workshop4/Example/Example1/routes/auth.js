const argon2 = require('argon2')
const collectMessages = require('../utils')
module.exports = async (fastify, opts) => {
  

  fastify.get('/register', async (request, reply) => {
    messages = collectMessages(reply)
    return reply.view('register', { messages: messages })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    if (fastify.users[username]) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    const passwordHash = await argon2.hash(password) 
    fastify.users[username] = { passwordHash }
    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    messages = collectMessages(reply)
    return reply.view('login', { messages: messages })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    const user = fastify.users[username]

    if (!user || !(await argon2.verify(user.passwordHash,password))) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user', username)
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    return reply.redirect('/login')
  })
}