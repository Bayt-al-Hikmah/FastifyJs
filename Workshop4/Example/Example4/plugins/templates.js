const fp = require('fastify-plugin')
const path = require('path')

module.exports = fp(async (fastify, opts) => {
  fastify.register(require('@fastify/view'), {
    engine: { handlebars: require('handlebars') },
    templates: path.join(__dirname, '../views'),
    includeViewExtension: true,
options: {
    partials: {
      _layout: 'partials/_layout.hbs'

    }
  }
  })
})