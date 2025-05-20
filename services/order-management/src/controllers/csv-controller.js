// src/controllers/csv-controller.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const PlatformServiceFactory = require('../services/PlatformServiceFactory');
const { authenticateToken } = require('../middleware/auth-middleware');

const logger = require('../utils/logger');

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

// Apply authentication middleware to all routes
router.use(authenticateToken);
  
// CSV file upload and processing routes
router.post('/validate', upload.single('file'), validateCSV);
router.post('/import/:connectionId', upload.single('file'), importCSV);
router.get('/templates', getTemplates);
  

async function validateCSV(req, res) {
  try {
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
    logger.error(`Failed to validate CSV file: ${error.message}`, { error, userId: req.user.id });
    
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
    // Get platform service
    const platformService = await PlatformServiceFactory.createService(connectionId);
    
    // Import orders from CSV
    const result = await platformService.importOrdersFromCSV(req.file, {
      hasHeaders,
      skipHeader,
      delimiter,
      overwriteExisting,
      columnMap: parsedColumnMap
    });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to import CSV: ${error.message}`, { error, userId: req.user.id, connectionId: req.params.connectionId });
    
    return res.status(500).json({
      success: false,
      message: `Failed to import CSV: ${error.message}`,
      error: error.message
    });
  }
}

async function getTemplates(req, res) {
  try {
    // Create temporary CSV service to get templates
    const csvService = new (require('../services/platforms/csv/csv-importer'))(null);
    
    // Get column mapping templates
    const templates = csvService.getColumnMappingTemplates();
    
    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error(`Failed to get CSV templates: ${error.message}`, { error, userId: req.user.id });
    
    return res.status(500).json({
      success: false,
      message: `Failed to get CSV templates: ${error.message}`,
      error: error.message
    });
  }
}


module.exports = router;