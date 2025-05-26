const axios = require('axios');

// Configuration - modify as needed
const API_URL = 'http://localhost:3001';  // Updated to match your actual server port
const EMAIL = 'dev@example.com';          // Default dev user
const PASSWORD = 'devpassword123';        // Default dev password

async function generateToken() {
  try {
    console.log('Attempting to login and generate token...');
    
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });
    
    if (response.data.success && response.data.token) {
      console.log('\n===== AUTHENTICATION SUCCESSFUL =====');
      console.log(`\nToken: ${response.data.token}`);
      console.log('\nFor use with curl:');
      console.log(`curl -X GET "${API_URL}/api/orders" \\`);
      console.log(`  -H "Authorization: Bearer ${response.data.token}" \\`);
      console.log('  -H "Content-Type: application/json"');
      
      return {
        success: true,
        token: response.data.token,
        user: response.data.user
      };
    } else {
      console.error('Login successful but no token received:', response.data);
      return {
        success: false,
        error: 'No token received from login'
      };
    }
  } catch (error) {
    console.error('Failed to generate token:');
    console.error(error.response?.data?.message || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Export the function for use as a module
async function generateDevToken() {
  return await generateToken();
}

// If running directly as a script, execute the function
if (require.main === module) {
  generateToken().then(result => {
    if (!result.success) {
      process.exit(1);
    }
  });
}

module.exports = { generateDevToken };
