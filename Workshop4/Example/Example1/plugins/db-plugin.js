const fp = require('fastify-plugin');

const users={}

async function dbConnector (fastify, options) {
  fastify.decorate('users', users);
}

module.exports = fp(dbConnector, {
    name: 'data-connector' 
});