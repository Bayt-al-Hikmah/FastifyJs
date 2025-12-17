
const argon2 = require('argon2')



module.exports = async (fastify, opts) => {
  const rateLimitConfig = {
    rateLimit: {
      max: 100,
      timeWindow: '1 minute',
    },
  };
  fastify.get('/api/tasks', {preHandler: fastify.authenticate,config: rateLimitConfig}, async (request, reply) => {
    const { Task } = fastify.models
    const tasks = await Task.findAll({ where: { userId: request.user.id} })
    return reply.status(201).send(
      tasks.map(task => ({
        id: task.id,
        name: task.name,
        state: task.state,
        createdAt: task.createdAt,
      }))
    )
  });
 fastify.post('/api/tasks', {preHandler: fastify.authenticate,config: rateLimitConfig}, async (request, reply) => {
    const { name } = request.body;
    const { Task} = fastify.models
    const task = await Task.create({ name, userId: request.user.id})
    await task.save()
    return reply.status(201).send({ message: 'Task created successfully' })
  });

 fastify.put('/api/tasks/:taskId', {preHandler: fastify.authenticate,config: rateLimitConfig}, async (request, reply) => {
    const { taskId } = request.params;
    const { name, state } = request.body;
    const { Task } = fastify.models
    const task = await Task.findOne({ where: { id: parseInt(taskId), userId: request.user.id} })
    if (!task) {
        return reply.status(401).send({ message: 'Task not found' });
    }
    await Task.update(
        {
        ...(name !== undefined && { name }),
        ...(state !== undefined && { state }),
        },
        {
        where: { id: task.id  },
        }
        );
    return reply.status(201).send({ message: 'Task updated successfully' })
  });
  
  fastify.delete('/api/tasks/:taskId',{preHandler: fastify.authenticate,config: rateLimitConfig},  async (request, reply) => {
    const { taskId } = request.params;
    const { Task } = fastify.models
    const task = await Task.findOne({ where: { id: parseInt(taskId), userId: request.user.id} })
    if (!task) {
        return reply.status(401).send({ message: 'Task not found' });
    }
    await Task.destroy({
    where: { id: task.id },
    });
    return reply.status(201).send({ message: 'Task deleted successfully' })

  });

}
