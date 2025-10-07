const fastify = require('fastify')({ logger: true })
const path = require('path')


fastify.setErrorHandler(async (error, request, reply) => {
  if (error.validation) {
    const token = await reply.generateCsrf();
    return reply.view('contact_csrf', { errors: error.validation, csrfToken: token })
  }
  reply.send(error)
})

// Register Plugins
fastify.register(require('@fastify/formbody'))
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/csrf'))
fastify.register(require('./routes/contact_csrf'), { prefix: '/' })

// Register Routes
fastify.register(require('./routes/home'), { prefix: '/' })
fastify.register(require('./routes/profile'), { prefix: '/' })
fastify.register(require('./routes/dashboard'), { prefix: '/' })
fastify.register(require('./routes/contact'), { prefix: '/' })

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