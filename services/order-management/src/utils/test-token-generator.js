/**
 * Development utility to generate test tokens for Swagger UI
 * IMPORTANT: This should only be used in development environments
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config();

// Mock user for development/test environments
const TEST_USER = {
  id: '1', // Use a numeric string to match database IDs
  email: 'test@example.com',
  fullName: 'Test User',
  companyName: 'Test Company',
  role: 'admin' // Admin role for full access
};

/**
 * Generate a test token for development purposes
 */
function generateTestToken() {
  // Get JWT secret from environment with fallback - must match auth-middleware.js
  const JWT_SECRET = process.env.JWT_SECRET || 'pazar-plus-development-secret';
  
  if (!JWT_SECRET) {
    console.error('WARNING: JWT_SECRET is not set, using fallback for test token');
  }
  
  // Create a token with extended expiration for testing
  const token = jwt.sign(
    { 
      id: TEST_USER.id,
      email: TEST_USER.email,
      role: TEST_USER.role
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Extended expiration for testing
  );
  
  return token;
}

module.exports = {
  TEST_USER,
  generateTestToken
};