const argon2 = require('argon2')
const collectMessages = require('../utils')

module.exports = async (fastify, opts) => {
  fastify.get('/register', async (request, reply) => {
    const messages = collectMessages(reply)
    return reply.view('register', { messages: messages })
  })

  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body

    const existingUser = await new Promise((resolve, reject) => {
      fastify.db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
        if (err) reject(err)
        resolve(row)
      })
    })

    if (existingUser) {
      request.flash('danger', 'Username already exists!')
      return reply.redirect('/register')
    }

    // Hash password and insert user
    const passwordHash = await argon2.hash(password)
    await new Promise((resolve, reject) => {
      fastify.db.run('INSERT INTO user (username, password_hash) VALUES (?, ?)', [username, passwordHash], (err) => {
        if (err) reject(err)
        resolve()
      })
    })

    request.flash('success', 'Registration successful! Please log in.')
    return reply.redirect('/login')
  })

  fastify.get('/login', async (request, reply) => {
    const messages = collectMessages(reply)
    return reply.view('login', { messages: messages })
  })

  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body

    const user = await new Promise((resolve, reject) => {
      fastify.db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
        if (err) reject(err)
        resolve(row)
      })
    })

    if (!user || !(await argon2.verify(user.password_hash, password) )) {
      request.flash('danger', 'Invalid username or password.')
      return reply.redirect('/login')
    }

    request.session.set('user_id', user["id"])
    request.session.set('user', user["username"])
    request.flash('success', 'Logged in successfully!')
    return reply.redirect('/')
  })

  fastify.get('/logout', async (request, reply) => {
    await request.session.destroy()
    return reply.redirect('/login')
  })
}