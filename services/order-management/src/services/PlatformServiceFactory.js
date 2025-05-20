// PlatformServiceFactory.js
// Factory to select between legacy and generic platform service implementations
const platformService = require('./platformService');
let genericPlatformService;

const useGeneric = process.env.USE_GENERIC_PLATFORM_SERVICE === 'true';

function getPlatformService() {
  if (useGeneric) {
    if (!genericPlatformService) {
      // Lazy load to avoid circular dependencies if any
      genericPlatformService = require('./genericPlatformService');
    }
    return genericPlatformService;
  }
  return platformService;
}

module.exports = {
  getPlatformService,
};
