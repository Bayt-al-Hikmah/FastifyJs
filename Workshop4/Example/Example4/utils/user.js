const argon2 = require('argon2')
class User {
  static async create(db, username, password) {
    const passwordHash = await argon2.hash(password)
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO user (username, password_hash) VALUES (?, ?)', [username, passwordHash], function (err) {
        if (err) reject(err)
        resolve(this.lastID)
      })
    })
  }

  static async findByUsername(db, username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
        if (err) reject(err)
        resolve(row)
      })
    })
  }
}

module.exports = User