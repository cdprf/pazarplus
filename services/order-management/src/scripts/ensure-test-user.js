/**
 * Development utility script to ensure test user exists and is active
 */

const { User } = require('../models');
const bcrypt = require('bcrypt');
const { TEST_USER } = require('../utils/test-token-generator');
const logger = require('../utils/logger');

/**
 * Ensures that a test user exists and is active for development purposes
 */
async function ensureTestUser() {
  try {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Try to find the test user
    let testUser = await User.findOne({ 
      where: { 
        email: TEST_USER.email 
      } 
    });

    if (testUser) {
      // Update the existing user if needed
      if (!testUser.isActive) {
        testUser.isActive = true;
        await testUser.save();
        logger.info(`Dev test user (${TEST_USER.email}) has been activated`);
      }
    } else {
      // Create a new test user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('TestPassword123', salt);
      
      testUser = await User.create({
        id: parseInt(TEST_USER.id),
        email: TEST_USER.email,
        password: hashedPassword,
        fullName: TEST_USER.fullName,
        companyName: TEST_USER.companyName,
        role: TEST_USER.role,
        isActive: true
      });
      
      logger.info(`Dev test user created: ${TEST_USER.email}`);
    }
    
    // Verify the user is now active
    const verifiedUser = await User.findByPk(testUser.id);
    if (verifiedUser && verifiedUser.isActive) {
      logger.info(`Test user (ID: ${verifiedUser.id}) is active and ready for development use`);
    } else {
      logger.error('Failed to verify test user is active');
    }
  } catch (error) {
    logger.error('Error ensuring test user exists:', error);
  }
}

module.exports = ensureTestUser;