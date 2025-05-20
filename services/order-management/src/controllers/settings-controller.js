const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// Path to store company settings
const COMPANY_SETTINGS_PATH = path.join(__dirname, '..', '..', 'data', 'company-settings.json');

// Ensure directory exists
async function ensureDirectoryExists() {
  const dir = path.dirname(COMPANY_SETTINGS_PATH);
  try {
    await fs.access(dir);
  } catch (err) {
    // Directory doesn't exist, create it
    await fs.mkdir(dir, { recursive: true });
  }
}

// Initialize settings file if it doesn't exist
async function initSettingsFile() {
  try {
    await fs.access(COMPANY_SETTINGS_PATH);
  } catch (err) {
    // File doesn't exist, create it with default values
    const defaultSettings = {
      companyName: 'Pazar+',
      companyPhone: '0(555) 123 45 67',
      companyEmail: 'support@pazar-plus.com',
      companyWebsite: 'www.pazar-plus.com',
      companyAddress: '',
      companyLogo: null,
    };
    
    await ensureDirectoryExists();
    await fs.writeFile(COMPANY_SETTINGS_PATH, JSON.stringify(defaultSettings, null, 2), 'utf8');
    return defaultSettings;
  }
  
  // File exists, read and return it
  const data = await fs.readFile(COMPANY_SETTINGS_PATH, 'utf8');
  return JSON.parse(data);
}

/**
 * Get company information
 */
exports.getCompanyInfo = async (req, res) => {
  try {
    const companyInfo = await initSettingsFile();
    
    return res.status(200).json({
      success: true,
      data: companyInfo,
    });
  } catch (err) {
    logger.error('Error getting company information:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve company information',
      error: err.message,
    });
  }
};

/**
 * Save company information
 */
exports.saveCompanyInfo = async (req, res) => {
  try {
    const { 
      companyName,
      companyPhone,
      companyEmail,
      companyWebsite,
      companyAddress,
      companyLogo 
    } = req.body;
    
    // Validate required fields
    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required',
      });
    }
    
    // Get existing settings or initialize
    const existingSettings = await initSettingsFile();
    
    // Update settings
    const updatedSettings = {
      ...existingSettings,
      companyName,
      companyPhone: companyPhone || existingSettings.companyPhone,
      companyEmail: companyEmail || existingSettings.companyEmail,
      companyWebsite: companyWebsite || existingSettings.companyWebsite,
      companyAddress: companyAddress || existingSettings.companyAddress,
      companyLogo: companyLogo || existingSettings.companyLogo,
      updatedAt: new Date().toISOString(),
    };
    
    // Save settings
    await ensureDirectoryExists();
    await fs.writeFile(COMPANY_SETTINGS_PATH, JSON.stringify(updatedSettings, null, 2), 'utf8');
    
    return res.status(200).json({
      success: true,
      message: 'Company information saved successfully',
      data: updatedSettings,
    });
  } catch (err) {
    logger.error('Error saving company information:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save company information',
      error: err.message,
    });
  }
};

/**
 * Upload company logo
 */
exports.uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }
    
    // Create a URL path for the logo
    const logoUrl = `/uploads/company-logo/${req.file.filename}`;
    
    // Get existing settings
    const existingSettings = await initSettingsFile();
    
    // Update logo
    const updatedSettings = {
      ...existingSettings,
      companyLogo: logoUrl,
      updatedAt: new Date().toISOString(),
    };
    
    // Save settings
    await fs.writeFile(COMPANY_SETTINGS_PATH, JSON.stringify(updatedSettings, null, 2), 'utf8');
    
    return res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      data: { logoUrl },
    });
  } catch (err) {
    logger.error('Error uploading company logo:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload company logo',
      error: err.message,
    });
  }
};