const fp = require('fastify-plugin');

const inMemoryDatabase = {
  users: {},
  pages: {}
};

async function dbConnector (fastify, options) {
  fastify.decorate('dataStore', inMemoryDatabase);
}

module.exports = fp(dbConnector, {
    name: 'data-connector' 
});