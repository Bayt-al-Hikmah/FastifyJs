const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
fastify.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    console.log(err)
    reply.code(401).send({ error: "Unauthorized" })
  }
})
})
