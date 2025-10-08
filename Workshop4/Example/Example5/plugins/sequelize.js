const fp = require('fastify-plugin')
const { Sequelize } = require('sequelize')

module.exports = fp(async (fastify, opts) => {
  // Initialize Sequelize
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.db',
    logging: false
  })

 
  const models = require('../models')(sequelize)

  
  fastify.decorate('sequelize', sequelize)
  fastify.decorate('models', models)

  
  fastify.addHook('onClose', async (fastify, done) => {
    await sequelize.close()
    done()
  })
})