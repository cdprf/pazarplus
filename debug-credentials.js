const { PlatformConnection } = require('./server/models');
const HepsiburadaService = require('./server/modules/order-management/services/platforms/hepsiburada/hepsiburada-service');

async function testCredentialDecryption() {
  try {
    console.log('Looking for Hepsiburada platform connection...');
    
    // Find the Hepsiburada connection
    const connection = await PlatformConnection.findOne({
      where: { platformType: 'hepsiburada' }
    });
    
    if (!connection) {
      console.log('No Hepsiburada connection found');
      return;
    }
    
    console.log('Found connection:', {
      id: connection.id,
      platformType: connection.platformType,
      credentialsType: typeof connection.credentials,
      credentialsLength: connection.credentials ? connection.credentials.length : 0
    });
    
    console.log('Raw credentials string:', connection.credentials);
    
    // Test the credential parsing
    let parsed;
    try {
      parsed = JSON.parse(connection.credentials);
      console.log('Parsed credentials:', parsed);
      console.log('Has username:', !!parsed.username);
      console.log('Has merchantId:', !!parsed.merchantId);
      console.log('Has apiKey:', !!parsed.apiKey);
      console.log('Has environment:', !!parsed.environment);
    } catch (parseError) {
      console.log('Failed to parse credentials as JSON:', parseError.message);
    }
    
    // Test the HepsiburadaService decryption
    const service = new HepsiburadaService(connection.id);
    service.connection = connection;
    
    console.log('Testing HepsiburadaService decryptCredentials...');
    const decrypted = service.decryptCredentials(connection.credentials);
    console.log('Successfully decrypted:', decrypted);
    
  } catch (error) {
    console.error('Error during test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCredentialDecryption().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});