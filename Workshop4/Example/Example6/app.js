const fastify = require('fastify')({ logger: true })
const path = require('path')
const AutoLoad = require('@fastify/autoload')

// Automatically load all plugins from the plugins folder
fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'plugins')
})

fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'routes')
})
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