const express = require('express');
const exportService = require('../services/exportService');
const { authenticateToken } = require('../middleware/auth-middleware');
console.log('authenticateToken:', authenticateToken); 
const logger = require('../utils/logger');

class ExportController {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Apply authentication middleware to all export routes
    this.router.use(authenticateToken);
    
    // Export routes
    this.router.post('/orders/csv', this.exportOrdersToCSV);
    this.router.post('/orders/excel', this.exportOrdersToExcel);
    this.router.post('/order-items/csv', this.exportOrderItemsToCSV);
    this.router.get('/files', this.getExportFiles);
    this.router.delete('/files/:filename', this.deleteExportFile);
  }

  async exportOrdersToCSV(req, res) {
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

  async exportOrdersToExcel(req, res) {
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

  async exportOrderItemsToCSV(req, res) {
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

  async getExportFiles(req, res) {
    try {
      const userId = req.user.id;
      const fs = require('fs');
      const path = require('path');
      const exportDir = path.join(__dirname, '../../public/exports');
      
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

  async deleteExportFile(req, res) {
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
      
      const fs = require('fs');
      const path = require('path');
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
}

module.exports = new ExportController();