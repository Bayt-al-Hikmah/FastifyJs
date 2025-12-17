module.exports = (sequelize) => {
  const Task = require('./Task')(sequelize)
  const User = require('./User')(sequelize)
   
  sequelize.sync({ force: true }) 
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Failed to sync database:', err))
  return { User,Task }
}