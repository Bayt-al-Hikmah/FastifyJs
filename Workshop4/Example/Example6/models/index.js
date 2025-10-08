module.exports = (sequelize) => {
  const User = require('./user')(sequelize)

  // Sync models with database
  sequelize.sync({ force: true }) // Recreate tables (use cautiously in production)
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Failed to sync database:', err))

  return { User }
}