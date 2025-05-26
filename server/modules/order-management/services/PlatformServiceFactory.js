// PlatformServiceFactory.js
// Factory for platform service implementations
const platformService = require('./platformService');
const logger = require('../../../utils/logger');

function getPlatformService() {
  // Always return the main platform service since genericPlatformService was removed
  return platformService;
}

module.exports = {
  getPlatformService,
};
