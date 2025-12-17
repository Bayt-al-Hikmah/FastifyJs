const fs = require('fs');
const path = require('path');


async function saveFile(fastify,file){

    if (!fastify.allowedFile(file.filename)) {
      return {status:false,avatar:filename};
    }

    const filename = `${Date.now()}_${file.filename}`
    const filepath = path.join(fastify.UPLOAD_FOLDER, filename)
    await fs.promises.writeFile(filepath, file._buf);
    console.log('File saved to', filename);
    return {status:true,avatar:filename};
}
module.exports = saveFile;