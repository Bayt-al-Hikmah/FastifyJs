const fp = require('fastify-plugin')
const sqlite3 = require('sqlite3').verbose()

module.exports = fp(async (fastify, opts) => {
  const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
      fastify.log.error('Failed to connect to SQLite:', err)
      throw err
    }
    fastify.log.info('Connected to SQLite database')
  })

  fastify.decorate('db', db)

  fastify.addHook('onClose', (fastify, done) => {
    db.close((err) => {
      if (err) fastify.log.error('Failed to close SQLite:', err)
      done()
    })
  })
})