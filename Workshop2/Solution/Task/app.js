const fastify = require('fastify')({ logger: true })
const path = require('path')

fastify.setErrorHandler(async (error, request, reply) => {
  if (error.validation) {
    const token = await reply.generateCsrf();
    let viewName;
    if (request.url.startsWith('/share')) viewName = 'share';
    else if (request.url.startsWith('/search')) viewName = 'search';
    fastify.log.warn("errror")
    return reply.view(viewName, { errors: error.validation, csrfToken: token });
  }
  reply.send(error)
})


let QuotesDB = []; // Quotes database
fastify.decorate('QuotesDB', QuotesDB); // Register QuotesDB so we can access it in routes
// Register plugins
fastify.register(require('./plugins/templates'))
fastify.register(require('./plugins/static'))
fastify.register(require('./plugins/csrf'))
fastify.register(require('./plugins/formbody'))
// Register routes
fastify.register(require('./routes/home'), { prefix: '/' })
fastify.register(require('./routes/share'), { prefix: '/' })
fastify.register(require('./routes/search'), { prefix: '/' })



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