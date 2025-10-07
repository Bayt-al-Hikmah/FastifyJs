const fastify = require('fastify')({ logger: true })
const path = require('path')

// Plugins
fastify.register(require('@fastify/formbody'))
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/session'))
fastify.register(require('./plugins/db-plugin')); 



// Routes
fastify.register(require('./routes/auth'), { prefix: '/' })

fastify.get('/', async (request, reply) => {
  return reply.view('home')
})

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