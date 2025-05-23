const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('./logger');

const generateDevToken = async () => {
  try {
    // Find the development user
    const devUser = await User.findOne({
      where: { email: 'dev@example.com' }
    });

    if (!devUser) {
      logger.error('Development user not found');
      return null;
    }

    // Generate JWT token with correct user ID
    const token = jwt.sign(
      { id: devUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    logger.info(`Generated new development token for user ID: ${devUser.id}`);
    return {
      token,
      user: {
        id: devUser.id,
        email: devUser.email,
        fullName: devUser.fullName,
        role: devUser.role
      }
    };
  } catch (error) {
    logger.error(`Failed to generate development token: ${error.message}`);
    return null;
  }
};

module.exports = { generateDevToken };
