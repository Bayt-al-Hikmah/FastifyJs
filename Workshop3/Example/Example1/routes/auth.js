const argon2 = require('argon2')

function collectMessages(reply) {
    const categories = ['danger', 'success', 'info']
    const messages = []

    for (const category of categories) {
      const msgs = reply.flash(category) || []
      for (const msg of msgs) {
        messages.push({ category, message: msg })
      }
    }

    return messages
  }

module.exports = async (fastify, opts) => {
  fastify.get('/register', async (request, reply) => {
    messages = collectMessages(reply)
    return reply.view('register', { messages: messages})
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    if (fastify.dataStore.users[username]) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }
    const hashedPassword = await argon2.hash(password)
    fastify.dataStore.users[username] = { password: hashedPassword, avatar: null }
    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    messages = collectMessages(reply)

    return reply.view('login', { messages: messages })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body
    const user = fastify.dataStore.users[username]

    if (user && await argon2.verify(user.password, password)) {
      request.session.set('username', username)
      request.flash('success', 'Login successful!')
      return reply.redirect('/home')
    } else {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    return reply.redirect('/login')
  })
}