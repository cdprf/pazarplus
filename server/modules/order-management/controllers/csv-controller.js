// src/controllers/csv-controller.js

const CSVImporterService = require('../services/platforms/csv/csv-importer');
const { PlatformConnection } = require('../../../models');
const logger = require('../../../utils/logger');
const multer = require('multer');

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

async function validateCSV(req, res) {
  try {
    // Check for user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get CSV options from request
    const {
      hasHeaders = true,
      skipHeader = false,
      delimiter = ',',
      columnMap
    } = req.body;
    
    // Parse column map if provided as string
    let parsedColumnMap = columnMap;
    if (typeof columnMap === 'string') {
      try {
        parsedColumnMap = JSON.parse(columnMap);
      } catch (error) {
        logger.warn(`Failed to parse column map: ${error.message}`, { error });
        parsedColumnMap = null;
      }
    }
    
    // Create temporary CSV service for validation
    const csvService = new (require('../services/platforms/csv/csv-importer'))(null);
    
    // Validate CSV file
    const result = await csvService.validateCSVFile(req.file, {
      hasHeaders,
      skipHeader,
      delimiter,
      columnMap: parsedColumnMap
    });
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to validate CSV file: ${error.message}`, { 
      error, 
      userId: req.user?.id,
      filename: req.file?.originalname 
    });
    
    return res.status(500).json({
      success: false,
      message: `Failed to validate CSV file: ${error.message}`,
      error: error.message
    });
  }
}

async function importCSV(req, res) {
  try {
    const { connectionId } = req.params;
    
    // Check for user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Validate connection ID
    if (!connectionId) {
      return res.status(400).json({
        success: false,
        message: 'Connection ID is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get CSV options from request
    const {
      hasHeaders = true,
      skipHeader = false,
      delimiter = ',',
      overwriteExisting = false,
      columnMap
    } = req.body;
    
    // Parse column map if provided as string
    let parsedColumnMap = columnMap;
    if (typeof columnMap === 'string') {
      try {
        parsedColumnMap = JSON.parse(columnMap);
      } catch (error) {
        logger.warn(`Failed to parse column map: ${error.message}`, { error });
        parsedColumnMap = null;
      }
    }
    
    // Get platform service - ensure it's created with the correct connection
    const platformService = await PlatformServiceFactory.createService(connectionId, req.user.id);
    
    // Check if platform service was created successfully
    if (!platformService) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found or invalid'
      });
    }
    
    // Import orders from CSV
    const result = await platformService.importOrdersFromCSV(req.file, {
      hasHeaders,
      skipHeader,
      delimiter,
      overwriteExisting,
      columnMap: parsedColumnMap,
      userId: req.user.id
    });
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to import CSV: ${error.message}`, { 
      error, 
      userId: req.user?.id, 
      connectionId: req.params.connectionId,
      filename: req.file?.originalname
    });
    
    return res.status(500).json({
      success: false,
      message: `Failed to import CSV: ${error.message}`,
      error: error.message
    });
  }
}

async function getTemplates(req, res) {
  try {
    // Check for user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Create temporary CSV service to get templates
    const csvService = new (require('../services/platforms/csv/csv-importer'))(null);
    
    // Get column mapping templates
    const templates = csvService.getColumnMappingTemplates();
    
    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error(`Failed to get CSV templates: ${error.message}`, { 
      error, 
      userId: req.user?.id 
    });
    
    return res.status(500).json({
      success: false,
      message: `Failed to get CSV templates: ${error.message}`,
      error: error.message
    });
  }
}

module.exports = {
  validateCSV,
  importCSV,
  getTemplates,
  upload // Export multer configuration for use in routes
};