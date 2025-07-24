/**
 * QNB Finans SOAP Client
 * Handles SOAP envelope creation, requests, and response parsing
 */

const axios = require('axios');
const xml2js = require('xml2js');
const config = require('../config/QNBConfig');
const logger = require('../../../utils/logger');

class SOAPClient {
  constructor() {
    this.xmlBuilder = new xml2js.Builder({ headless: true });
    this.xmlParser = new xml2js.Parser({ explicitArray: false });
  }

  /**
   * Create SOAP envelope for EarsivWebService
   * @param {Object} bodyContent - SOAP body content
   * @param {Object} authHeader - Optional authentication header
   * @returns {string} SOAP XML string
   */
  createSOAPEnvelope(bodyContent, authHeader = null) {
    const envelope = {
      'soapenv:Envelope': {
        $: {
          'xmlns:soapenv': config.namespaces.soapEnv,
          'xmlns:ser': config.namespaces.earsivService
        },
        'soapenv:Header': authHeader || {},
        'soapenv:Body': bodyContent
      }
    };

    return this.xmlBuilder.buildObject(envelope);
  }

  /**
   * Make SOAP request to QNB Finans service
   * @param {string} soapXML - SOAP envelope XML
   * @param {Object} requestConfig - Request configuration
   * @returns {Object} Parsed response
   */
  async makeRequest(soapXML, requestConfig) {
    try {
      const {
        environment = 'test',
        sessionCookie = null,
        soapAction = ''
      } = requestConfig;

      const headers = {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: soapAction
      };

      // Add session cookie if available
      if (sessionCookie) {
        headers.Cookie = sessionCookie;
      }

      const serviceUrl = config.getEndpoint(environment, 'earsivService');

      logger.info('Making SOAP request', {
        url: serviceUrl,
        hasSession: !!sessionCookie,
        bodyLength: soapXML.length
      });

      const response = await axios.post(serviceUrl, soapXML, {
        headers,
        timeout: config.defaults.timeout
      });

      // Parse SOAP response
      const parsedResponse = await this.xmlParser.parseStringPromise(
        response.data
      );
      return this.parseSOAPResponse(parsedResponse);
    } catch (error) {
      logger.error(`SOAP request error: ${error.message}`, {
        error: error.message,
        requestConfig
      });

      // Handle specific HTTP errors
      if (error.response) {
        const statusCode = error.response.status;
        if (statusCode === 401) {
          throw new Error('Authentication failed - invalid credentials');
        } else if (statusCode === 403) {
          throw new Error('Access forbidden - insufficient permissions');
        } else if (statusCode >= 500) {
          throw new Error('Server error - QNB Finans service unavailable');
        }
      }

      throw error;
    }
  }

  /**
   * Parse SOAP response and extract result
   * @param {Object} soapResponse - Parsed SOAP response
   * @returns {Object} Extracted result
   */
  parseSOAPResponse(soapResponse) {
    try {
      // Handle different SOAP envelope variations
      const envelope =
        soapResponse['S:Envelope'] ||
        soapResponse['soap:Envelope'] ||
        soapResponse['soapenv:Envelope'];

      if (!envelope) {
        throw new Error('Invalid SOAP response - no envelope found');
      }

      const body =
        envelope['S:Body'] || envelope['soap:Body'] || envelope['soapenv:Body'];

      if (!body) {
        throw new Error('Invalid SOAP response - no body found');
      }

      // Check for SOAP faults
      const fault =
        body['S:Fault'] || body['soap:Fault'] || body['soapenv:Fault'];
      if (fault) {
        const faultString =
          fault.faultstring || fault.faultString || 'Unknown SOAP fault';
        throw new Error(`SOAP Fault: ${faultString}`);
      }

      // Extract the actual response content
      const responseKeys = Object.keys(body);
      const responseContent = body[responseKeys[0]];

      if (!responseContent) {
        throw new Error('Invalid SOAP response - no content found');
      }

      // Handle different response formats
      if (responseContent.return) {
        const result = responseContent.return;
        const resultCode = result.resultCode;

        return {
          success: config.isSuccess(resultCode),
          resultCode: resultCode,
          resultText: result.resultText || config.getErrorMessage(resultCode),
          resultExtra: result.resultExtra,
          output: responseContent.output,
          data: result,
          raw: responseContent
        };
      }

      // Direct response without return wrapper
      return {
        success: true,
        data: responseContent,
        raw: responseContent
      };
    } catch (error) {
      logger.error(`SOAP response parsing error: ${error.message}`, { error });
      throw new Error(`Failed to parse SOAP response: ${error.message}`);
    }
  }

  /**
   * Create service method SOAP body
   * @param {string} methodName - Service method name
   * @param {Object} parameters - Method parameters
   * @returns {Object} SOAP body content
   */
  createMethodBody(methodName, parameters = {}) {
    const body = {};
    body[`ser:${methodName}`] = parameters;
    return body;
  }

  /**
   * Validate SOAP response for business logic errors
   * @param {Object} parsedResponse - Parsed SOAP response
   * @returns {Object} Validation result
   */
  validateResponse(parsedResponse) {
    if (!parsedResponse.success) {
      const errorCode = parsedResponse.resultCode;
      const errorMessage = config.getErrorMessage(errorCode);

      return {
        isValid: false,
        error: {
          code: errorCode,
          message: errorMessage,
          originalText: parsedResponse.resultText
        }
      };
    }

    return {
      isValid: true,
      data: parsedResponse.data
    };
  }

  /**
   * Extract properties from resultExtra field
   * @param {Object} resultExtra - Result extra object
   * @returns {Object} Extracted properties
   */
  extractResultExtra(resultExtra) {
    if (!resultExtra || !resultExtra.entry) {
      return {};
    }

    const properties = {};
    const entries = Array.isArray(resultExtra.entry)
      ? resultExtra.entry
      : [resultExtra.entry];

    entries.forEach((entry) => {
      if (entry.key && entry.value) {
        properties[entry.key] = entry.value;
      }
    });

    return properties;
  }
}

module.exports = SOAPClient;
