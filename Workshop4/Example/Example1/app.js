const fastify = require('fastify')({ logger: true })
const path = require('path')

// Plugins
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/formbody'));
fastify.register(require('./plugins/session'))
fastify.register(require('./plugins/db-plugin'));
fastify.register(require('./plugins/auth'))
fastify.register(require('./plugins/404'))

// Routes
fastify.register(require('./routes/auth'), { prefix: '/' })
fastify.register(require('./routes/profile'), { prefix: '/' })
fastify.get('/', async (request, reply) => {
  return reply.view('home',{session:request.session})
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