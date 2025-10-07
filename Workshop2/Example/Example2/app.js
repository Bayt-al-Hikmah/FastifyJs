const fastify = require('fastify')({ logger: true })
const path = require('path')


// Register Plugins
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))

// Register Routes
fastify.register(require('./routes/home'), { prefix: '/' })

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