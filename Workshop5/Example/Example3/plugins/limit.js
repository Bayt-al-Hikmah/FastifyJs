const rateLimit = require('@fastify/rate-limit');
const Redis = require('ioredis');
const fp = require('fastify-plugin')

module.exports = fp(async (fastify, opts) => {

  const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
  });

  await fastify.register(rateLimit, {
    redis,
     max: 50,
     timeWindow: '1 hour',
    keyGenerator: (request) => request.ip,
  });
  
})