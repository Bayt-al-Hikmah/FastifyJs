const fp = require('fastify-plugin')
const path = require('path')
const fs = require('fs')

const UPLOAD_FOLDER = path.join(path.dirname(__dirname), 'public/avatars')

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif'])
module.exports = fp(async (fastify, opts) => {
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    attachFieldsToBody: true // optional: auto attach text fields/files to request.body
  })
  if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true })
}

await fastify.decorate('UPLOAD_FOLDER', UPLOAD_FOLDER)
await fastify.decorate('allowedFile', filename => {
  if (!filename.includes('.')) return false
  const ext = filename.split('.').pop().toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
})
})