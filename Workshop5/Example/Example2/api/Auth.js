
const argon2 = require('argon2')
const saveFile = require('../utils')
module.exports = async (fastify, opts) => {
   fastify.post('/api/register', async (request, reply) => {
    
    const password  =  request.body.password.value
    const username  =  request.body.username.value
    const email     =  request.body.email.value
    const hashedPassword = await argon2.hash(password)

    
    const file = await request.body.avatar
    
    if (!file) {
      return reply.status(400).send({ message: 'Include File' })
    }
    
    const {status,avatar} = await saveFile(fastify,file)
    
    if(!status){
        return reply.status(400).send({ message: 'Invalid file type. Allowed: png, jpg, jpeg, gif.' })
    }
    const { User } = fastify.models
    const existingUser = await User.findOne({ where: { username } })
    
    if (existingUser) {
      return reply.status(400).send({ message: 'Username already taken' })
    }

    const user = await User.create({ username,password:hashedPassword,email,avatar})
    await user.save()
    return reply.status(201).send({ message: 'User registered successfully' });
  })

  fastify.post('/api/login', async (request, reply) => {
    const { email,password } = request.body
    const { User } = fastify.models
    const user = await User.findOne({ where: { email } })
    if (!user || !(await argon2.verify(user.password, password))) {
      return reply.status(401).send({ message: 'Invalid email or password' })
    }   
    
    const token = fastify.jwt.sign(
    {
      id: user.id,
      role: user.role
    },
  )
    
    return reply.send({ access_token:token,message: 'Login successful' });
    
  })
}