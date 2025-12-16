const argon2 = require('argon2')
const saveFile = require('../utils')
  
module.exports = async (fastify, opts) => {
   fastify.get('/api/user', async (request, reply) => {
        if (!request.session.userId) {
            return reply.status(401).send({ message: 'Unauthorized' });
        }
        const { User } = fastify.models
        const user = await User.findOne({ where: { id: request.session.userId} })
        return reply.status(201).send(
            {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: 'static/avatars/'+user.avatar,
            });
    });

    fastify.put('/api/user', async (request, reply) => {
        if (!request.session.userId) {
            return reply.status(401).send({ message: 'Unauthorized' });
        }

        
        const username = request.body.username?.value;
        const email = request.body.email?.value;
        const file = await request.body.avatar
        let filename;
        if (file) {
            const {status,avatar} = await saveFile(fastify,file)
            if(!status){
                return reply.status(400).send({ message: 'Invalid file type. Allowed: png, jpg, jpeg, gif.' })
            }
            filename = avatar;
        }
            
            
        const { User } = fastify.models

        await User.update(
        {
        ...(username !== undefined && { username }),
        ...(email !== undefined && { email }),
        ...(filename !== undefined && { avatar: filename }),
        },
        {
        where: { id: request.session.userId },
        }
        );
    return reply.status(201).send({ message: 'User profile updated successfully' });

});

fastify.patch('/api/user/password', async  (request, reply)=> {
    const { password } = request.body;
    const hashedPassword = await argon2.hash(password);
    const { User } = fastify.models
    await User.update(
    { password: hashedPassword },
    {
        where: { id: request.session.userId },
    }
    );
    return reply.status(201).send({ message: 'Password updated successfully'  });


});
}