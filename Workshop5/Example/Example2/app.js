const fastify = require('fastify')({ logger: true })
const path = require('path')
const AutoLoad = require('@fastify/autoload')
require('dotenv').config();

fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'plugins')
})
fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'api')
})

fastify.get('/', async (request, reply) => {
  return reply.view('index')
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