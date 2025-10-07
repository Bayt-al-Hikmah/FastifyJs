const fs = require('fs');
const path = require('path');
const collectMessages = require('../utils')

module.exports = async (fastify, opts) => {
  fastify.get('/profile', async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to view your profile.')
      return reply.redirect('/login')
    }
    const user = fastify.dataStore.users[request.session.get('username')]
    messages = collectMessages(reply)
    return reply.view('profile', { user, messages: messages })
  })


  fastify.post('/profile', async (request, reply) => {
    if (!request.session.get('username')) {
      request.flash('danger', 'You must be logged in to upload an avatar.')
      return reply.redirect('/login')
    }

    const file = await request.body.avatar
    
    if (!file) {
      request.flash('danger', 'No file selected.')
      return reply.redirect('/profile')
    }

    if (!fastify.allowedFile(file.filename)) {
      request.flash('danger', 'Invalid file type. Allowed: png, jpg, jpeg, gif.')
      return reply.redirect('/profile')
    }

    const filename = `${Date.now()}_${file.filename}`
    const filepath = path.join(fastify.UPLOAD_FOLDER, filename)
    await fs.promises.writeFile(filepath, file._buf);
       

    fastify.dataStore.users[request.session.get('username')].avatar = filename
    request.flash('success', 'Avatar updated!')
    return reply.redirect('/profile')
  })
}