const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define(
    'Task',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true,},
      name: { type: DataTypes.STRING, allowNull: false,},
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW,},
      state: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active',},
      userId: { type: DataTypes.INTEGER, allowNull: false,},
    },
    {
      tableName: 'tasks', 
      timestamps: false, 
    }
  );

  Task.associate = (models) => {
    Task.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };
  return Task;
};