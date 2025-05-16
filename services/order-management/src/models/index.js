// index.js
// This file is responsible for initializing the database connection and defining the models.
const User = require('./user.model');
const PlatformConnection = require('./platform-connection.model');

// Define relationships
User.hasMany(PlatformConnection, { foreignKey: 'userId' });
PlatformConnection.belongsTo(User, { foreignKey: 'userId' });

// Sync all models with database
const syncDatabase = async (force = false) => {
  await User.sync({ force });
  await PlatformConnection.sync({ force });
  console.log('Database models synchronized');
};

module.exports = {
  User,
  PlatformConnection,
  syncDatabase
};