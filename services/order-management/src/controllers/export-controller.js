const exportService = require('../services/exportService');
const { protect, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function exportOrdersToCSV(req, res) {
  try {
    const filters = req.body;
    const userId = req.user.id;
    
    const result = await exportService.exportOrdersToCSV(filters, userId);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to export orders to CSV: ${error.message}`, { error, userId: req.user.id });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to export orders to CSV',
      error: error.message
    });
  }
}

async function exportOrdersToExcel(req, res) {
  try {
    const filters = req.body;
    const userId = req.user.id;
    
    const result = await exportService.exportOrdersToExcel(filters, userId);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to export orders to Excel: ${error.message}`, { error, userId: req.user.id });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to export orders to Excel',
      error: error.message
    });
  }
}

async function exportOrderItemsToCSV(req, res) {
  try {
    const filters = req.body;
    const userId = req.user.id;
    
    const result = await exportService.exportOrderItemsToCSV(filters, userId);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to export order items to CSV: ${error.message}`, { error, userId: req.user.id });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to export order items to CSV',
      error: error.message
    });
  }
}

async function getExportFiles(req, res) {
  try {
    const userId = req.user.id;
    const exportDir = path.join(__dirname, '../../public/exports');
    
    // Ensure export directory exists
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Read directory
    const files = fs.readdirSync(exportDir);
    
    // Filter files by userId
    const userFiles = files.filter(file => file.includes(`_${userId}_`));
    
    // Get file details
    const fileDetails = userFiles.map(file => {
      const stats = fs.statSync(path.join(exportDir, file));
      return {
        filename: file,
        url: `/exports/${file}`,
        size: stats.size,
        created: stats.ctime
      };
    });
    
    // Sort by creation date (newest first)
    fileDetails.sort((a, b) => b.created - a.created);
    
    return res.status(200).json({
      success: true,
      data: fileDetails
    });
  } catch (error) {
    logger.error(`Failed to get export files: ${error.message}`, { error, userId: req.user.id });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get export files',
      error: error.message
    });
  }
}

async function deleteExportFile(req, res) {
  try {
    const { filename } = req.params;
    const userId = req.user.id;
    
    // Security check: ensure the file belongs to the user
    if (!filename.includes(`_${userId}_`)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const filePath = path.join(__dirname, '../../public/exports', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete file
    fs.unlinkSync(filePath);
    
    return res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error(`Failed to delete export file: ${error.message}`, { error, userId: req.user.id, filename: req.params.filename });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to delete export file',
      error: error.message
    });
  }
}

module.exports = {
  exportOrdersToCSV,
  exportOrdersToExcel,
  exportOrderItemsToCSV,
  getExportFiles,
  deleteExportFile
};