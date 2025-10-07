const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {
    await fastify.setNotFoundHandler((request, reply) => {
        reply.code(404).view('404', {
            title: 'Page Not Found',
            url: request.raw.url
        })
    })
})

