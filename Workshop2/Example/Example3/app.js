const fastify = require('fastify')({ logger: true })
const path = require('path')

// Plugins
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))

// Routes
fastify.register(require('./routes/home'), { prefix: '/' })
fastify.register(require('./routes/profile'), { prefix: '/' })
fastify.register(require('./routes/dashboard'), { prefix: '/' })

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server running at http://127.0.0.1:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()