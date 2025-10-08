const argon2 = require('argon2')
const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class User extends Model {
    async setPassword(password) {
      this.password_hash = await argon2.hash(password)
    }

    async checkPassword(password) {
      return argon2.verify(this.password_hash, password)
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(150),
      unique: true,
      allowNull: false
    },
    password_hash: {
      type: DataTypes.STRING(200),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'user',
    timestamps: false
  })

  return User
}