const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const emailService = require('../services/email.service');

// Paths for different settings files
const COMPANY_SETTINGS_PATH = path.join(__dirname, '..', '..', 'data', 'company-settings.json');
const GENERAL_SETTINGS_PATH = path.join(__dirname, '..', '..', 'data', 'general-settings.json');
const NOTIFICATION_SETTINGS_PATH = path.join(__dirname, '..', '..', 'data', 'notification-settings.json');
const SHIPPING_SETTINGS_PATH = path.join(__dirname, '..', '..', 'data', 'shipping-settings.json');
const EMAIL_SETTINGS_PATH = path.join(__dirname, '..', '..', 'data', 'email-settings.json');

// Ensure directory exists
async function ensureDirectoryExists() {
  const dir = path.dirname(COMPANY_SETTINGS_PATH);
  try {
    await fs.access(dir);
  } catch (err) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Initialize settings file
async function initSettingsFile(path, defaultSettings) {
  try {
    await fs.access(path);
    const data = await fs.readFile(path, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    await ensureDirectoryExists();
    await fs.writeFile(path, JSON.stringify(defaultSettings, null, 2), 'utf8');
    return defaultSettings;
  }
}

// Default settings
const defaultGeneralSettings = {
  defaultCurrency: "USD",
  timezone: "UTC",
  dateFormat: "MM/DD/YYYY",
  language: "en"
};

const defaultNotificationSettings = {
  emailNotifications: true,
  orderConfirmations: true,
  shipmentUpdates: true,
  statusChanges: true,
  dailySummary: false,
  marketingEmails: false
};

const defaultShippingSettings = {
  defaultCarrier: "",
  returnAddress: {
    name: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: ""
  },
  labelSize: "letter"
};

const defaultEmailSettings = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  username: process.env.SMTP_USER || '',
  from: process.env.SMTP_FROM || 'no-reply@pazar.plus'
};

// Company settings handlers
exports.getCompanyInfo = async (req, res) => {
  try {
    const companyInfo = await initSettingsFile(COMPANY_SETTINGS_PATH, {
      companyName: 'Pazar+',
      companyPhone: '',
      companyEmail: '',
      companyWebsite: '',
      companyAddress: '',
      companyLogo: null
    });
    
    return res.status(200).json({
      success: true,
      data: companyInfo
    });
  } catch (err) {
    logger.error('Error getting company information:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve company information',
      error: err.message
    });
  }
};

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
    const existingSettings = await initSettingsFile(COMPANY_SETTINGS_PATH, {
      companyName: 'Pazar+',
      companyPhone: '',
      companyEmail: '',
      companyWebsite: '',
      companyAddress: '',
      companyLogo: null
    });
    
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
    const existingSettings = await initSettingsFile(COMPANY_SETTINGS_PATH, {
      companyName: 'Pazar+',
      companyPhone: '',
      companyEmail: '',
      companyWebsite: '',
      companyAddress: '',
      companyLogo: null
    });
    
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

// General settings handlers
exports.getGeneralSettings = async (req, res) => {
  try {
    const settings = await initSettingsFile(GENERAL_SETTINGS_PATH, defaultGeneralSettings);
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (err) {
    logger.error('Error getting general settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve general settings',
      error: err.message
    });
  }
};

exports.saveGeneralSettings = async (req, res) => {
  try {
    const settings = req.body;
    await fs.writeFile(GENERAL_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return res.status(200).json({
      success: true,
      message: 'General settings saved successfully',
      data: settings
    });
  } catch (err) {
    logger.error('Error saving general settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save general settings',
      error: err.message
    });
  }
};

// Notification settings handlers
exports.getNotificationSettings = async (req, res) => {
  try {
    const settings = await initSettingsFile(NOTIFICATION_SETTINGS_PATH, defaultNotificationSettings);
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (err) {
    logger.error('Error getting notification settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification settings',
      error: err.message
    });
  }
};

exports.saveNotificationSettings = async (req, res) => {
  try {
    const settings = req.body;
    await fs.writeFile(NOTIFICATION_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return res.status(200).json({
      success: true,
      message: 'Notification settings saved successfully',
      data: settings
    });
  } catch (err) {
    logger.error('Error saving notification settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save notification settings',
      error: err.message
    });
  }
};

// Shipping settings handlers
exports.getShippingSettings = async (req, res) => {
  try {
    const settings = await initSettingsFile(SHIPPING_SETTINGS_PATH, defaultShippingSettings);
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (err) {
    logger.error('Error getting shipping settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipping settings',
      error: err.message
    });
  }
};

exports.saveShippingSettings = async (req, res) => {
  try {
    const settings = req.body;
    await fs.writeFile(SHIPPING_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return res.status(200).json({
      success: true,
      message: 'Shipping settings saved successfully',
      data: settings
    });
  } catch (err) {
    logger.error('Error saving shipping settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save shipping settings',
      error: err.message
    });
  }
};

// Email settings handlers
exports.getEmailSettings = async (req, res) => {
  try {
    const settings = await initSettingsFile(EMAIL_SETTINGS_PATH, defaultEmailSettings);
    // Don't return sensitive data like password
    const safeSettings = { ...settings };
    delete safeSettings.password;
    
    return res.status(200).json({
      success: true,
      data: safeSettings
    });
  } catch (err) {
    logger.error('Error getting email settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve email settings',
      error: err.message
    });
  }
};

exports.saveEmailSettings = async (req, res) => {
  try {
    const { host, port, secure, username, password, from } = req.body;
    
    // Validate required fields
    if (!host || !port || !username || !from) {
      return res.status(400).json({
        success: false,
        message: 'Missing required email settings fields'
      });
    }

    const settings = {
      host,
      port: parseInt(port),
      secure: !!secure,
      username,
      from
    };

    // Only update password if provided
    if (password) {
      settings.password = password;
    } else {
      // Keep existing password if exists
      const existingSettings = await initSettingsFile(EMAIL_SETTINGS_PATH, defaultEmailSettings);
      if (existingSettings.password) {
        settings.password = existingSettings.password;
      }
    }

    // Save settings
    await fs.writeFile(EMAIL_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');

    // Update environment variables
    process.env.SMTP_HOST = host;
    process.env.SMTP_PORT = port.toString();
    process.env.SMTP_SECURE = secure.toString();
    process.env.SMTP_USER = username;
    if (password) process.env.SMTP_PASS = password;
    process.env.SMTP_FROM = from;

    // Return success without sensitive data
    const safeSettings = { ...settings };
    delete safeSettings.password;

    return res.status(200).json({
      success: true,
      message: 'Email settings saved successfully',
      data: safeSettings
    });
  } catch (err) {
    logger.error('Error saving email settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save email settings',
      error: err.message
    });
  }
};

exports.testEmailSettings = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    await emailService.sendTestEmail(email);

    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (err) {
    logger.error('Error sending test email:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: err.message
    });
  }
};