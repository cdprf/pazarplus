/**
 * QNB Finans Authentication Manager
 * Handles login, logout, and session management
 */

const axios = require('axios');
const xml2js = require('xml2js');
const config = require('../config/QNBConfig');
const logger = require('../../../utils/logger');

class QNBAuthManager {
  constructor() {
    this.sessionCookie = null;
    this.xmlBuilder = new xml2js.Builder({ headless: true });
    this.xmlParser = new xml2js.Parser({ explicitArray: false });
    this.isAuthenticated = false;
  }

  /**
   * Login to QNB Finans system using UserService
   * @param {Object} userConfig - User's QNB Finans configuration
   * @returns {Object} Login result
   */
  async login(userConfig) {
    try {
      const {
        username,
        password,
        language = 'tr',
        environment = 'test'
      } = userConfig;

      if (!username || !password) {
        throw new Error('QNB Finans credentials not configured');
      }

      const soapEnvelope = {
        'soapenv:Envelope': {
          $: {
            'xmlns:soapenv': config.namespaces.soapEnv,
            'xmlns:ser': config.namespaces.userService
          },
          'soapenv:Header': {},
          'soapenv:Body': {
            'ser:wsLogin': {
              kullaniciAdi: username,
              sifre: password,
              dil: language
            }
          }
        }
      };

      const soapXML = this.xmlBuilder.buildObject(soapEnvelope);
      const userServiceUrl = config.getEndpoint(environment, 'userService');

      const response = await axios.post(userServiceUrl, soapXML, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: ''
        },
        withCredentials: true,
        timeout: config.defaults.timeout
      });

      // Extract session cookie from response
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        this.sessionCookie = cookies.find((cookie) =>
          cookie.includes('JSESSIONID')
        );
        this.isAuthenticated = true;
      }

      logger.info('QNB Finans login successful', {
        username,
        environment,
        hasSession: !!this.sessionCookie
      });

      return {
        success: true,
        message: 'QNB Finans login successful',
        sessionCookie: this.sessionCookie,
        isAuthenticated: this.isAuthenticated
      };
    } catch (error) {
      this.isAuthenticated = false;
      this.sessionCookie = null;

      logger.error(`QNB Finans login error: ${error.message}`, {
        error: error.message,
        username: userConfig.username
      });

      return {
        success: false,
        message: `Login failed: ${error.message}`,
        error: error.message,
        isAuthenticated: false
      };
    }
  }

  /**
   * Logout from QNB Finans system
   * @param {string} environment - Environment ('test' or 'production')
   * @returns {Object} Logout result
   */
  async logout(environment = 'test') {
    try {
      if (!this.sessionCookie) {
        return {
          success: true,
          message: 'No active session to logout'
        };
      }

      const soapEnvelope = {
        'soapenv:Envelope': {
          $: {
            'xmlns:soapenv': config.namespaces.soapEnv,
            'xmlns:ser': config.namespaces.userService
          },
          'soapenv:Header': {},
          'soapenv:Body': {
            'ser:logout': {}
          }
        }
      };

      const soapXML = this.xmlBuilder.buildObject(soapEnvelope);
      const userServiceUrl = config.getEndpoint(environment, 'userService');

      await axios.post(userServiceUrl, soapXML, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: '',
          Cookie: this.sessionCookie
        },
        timeout: config.defaults.timeout
      });

      this.sessionCookie = null;
      this.isAuthenticated = false;

      logger.info('QNB Finans logout successful');

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      // Clear session even if logout fails
      this.sessionCookie = null;
      this.isAuthenticated = false;

      logger.error(`QNB Finans logout error: ${error.message}`, { error });

      return {
        success: false,
        message: `Logout failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Create SOAP authentication header for header-based auth
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Object} SOAP security header
   */
  createAuthHeader(username, password) {
    return {
      'wsse:Security': {
        $: {
          'xmlns:wsse': config.namespaces.wsse
        },
        'wsse:UsernameToken': {
          'wsse:Username': username,
          'wsse:Password': password
        }
      }
    };
  }

  /**
   * Get current session cookie
   * @returns {string|null} Session cookie
   */
  getSessionCookie() {
    return this.sessionCookie;
  }

  /**
   * Check if currently authenticated
   * @returns {boolean} Authentication status
   */
  getAuthenticationStatus() {
    return this.isAuthenticated;
  }

  /**
   * Clear session (for error cleanup)
   */
  clearSession() {
    this.sessionCookie = null;
    this.isAuthenticated = false;
  }

  /**
   * Auto-login wrapper for service methods
   * @param {Object} userConfig - User configuration
   * @param {Function} serviceMethod - Method to execute after login
   * @returns {Object} Service method result
   */
  async withAuthentication(userConfig, serviceMethod) {
    try {
      // Login first
      const loginResult = await this.login(userConfig);
      if (!loginResult.success) {
        return loginResult;
      }

      // Execute the service method
      const result = await serviceMethod();

      // Always logout after operation
      await this.logout(userConfig.environment);

      return result;
    } catch (error) {
      // Cleanup on error
      await this.logout(userConfig.environment);
      throw error;
    }
  }
}

module.exports = QNBAuthManager;
