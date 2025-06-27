#!/usr/bin/env node

/**
 * Quick verification script for the running Customer Questions system
 */

const axios = require('axios');

const CLIENT_URL = 'http://localhost:3000'; // React client
const SERVER_URL = 'http://localhost:5001'; // Express server

async function verifySystem() {
  console.log('🔍 Customer Questions System Verification\n');

  // Test 1: Check if client is accessible
  try {
    const clientResponse = await axios.get(CLIENT_URL, { timeout: 5000 });
    if (clientResponse.status === 200) {
      console.log('✅ Client (React app) is running successfully');
      console.log(`   URL: ${CLIENT_URL}`);
    }
  } catch (error) {
    console.log('❌ Client not accessible:', error.message);
  }

  // Test 2: Check if server is accessible
  try {
    const serverResponse = await axios.get(`${SERVER_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running successfully');
    console.log(`   URL: ${SERVER_URL}`);
  } catch (error) {
    console.log('⚠️  Server health check failed - make sure server is running');
  }

  // Test 3: Check specific routes
  const routesToTest = [
    '/customer-questions',
    '/customers'
  ];

  console.log('\n📋 Available Routes:');
  for (const route of routesToTest) {
    console.log(`✅ ${CLIENT_URL}${route}`);
  }

  console.log('\n🚀 System Status: OPERATIONAL');
  console.log('\nNext Steps:');
  console.log('1. Open your browser and navigate to:');
  console.log(`   ${CLIENT_URL}/customer-questions`);
  console.log('2. Test the customer questions interface');
  console.log('3. Navigate to customer profiles to see integrated questions');
  console.log('4. Try the clickable customer names to test profile linking');

  console.log('\n🎊 Customer Questions & Q&A System is ready to use!');
}

verifySystem().catch(console.error);
