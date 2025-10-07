const fp = require('fastify-plugin')
const path = require('path')
const handlebars = require('handlebars')

module.exports = fp(async (fastify, opts) => {
  handlebars.registerHelper('eq', (a, b) => a === b),
  fastify.register(require('@fastify/view'), {
    
    engine: { handlebars: require('handlebars') },
    templates: path.join(__dirname, '../views'),
    includeViewExtension: true,
     options: {
    partials: {
      _layout: 'partials/_layout.hbs',
      _navbar: 'partials/_navbar.hbs',
      _footer: 'partials/_footer.hbs',
    }
  }
  })
})