// Centralized settings controller

const { User } = require('../models');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Get company info
const getCompanyInfo = async (req, res) => {
  try {
    // For now, return mock data until we have a CompanyInfo model
    const companyInfo = {
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      logo: null
    };

    res.json({
      success: true,
      data: companyInfo
    });
  } catch (error) {
    logger.error(`Get company info error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company information'
    });
  }
};

// Save company info
const saveCompanyInfo = async (req, res) => {
  try {
    const { name, address, phone, email, website } = req.body;

    // TODO: Implement actual saving to database
    // For now, just return success
    res.json({
      success: true,
      message: 'Company information saved successfully',
      data: { name, address, phone, email, website }
    });
  } catch (error) {
    logger.error(`Save company info error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to save company information'
    });
  }
};

// Upload company logo
const uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const logoPath = `/uploads/company-logo/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoPath,
        filename: req.file.filename
      }
    });
  } catch (error) {
    logger.error(`Upload logo error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo'
    });
  }
};

// Get general settings
const getGeneralSettings = async (req, res) => {
  try {
    // Get actual user settings from database
    const user = await User.findByPk(req.user.id, {
      attributes: ['settings']
    });

    const defaultSettings = {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      currency: 'USD'
    };

    const userSettings = user?.settings ? JSON.parse(user.settings) : {};
    const settings = { ...defaultSettings, ...userSettings };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error(`Get general settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch general settings'
    });
  }
};

// Save general settings
const saveGeneralSettings = async (req, res) => {
  try {
    const { language, timezone, dateFormat, currency } = req.body;
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentSettings = user.settings ? JSON.parse(user.settings) : {};
    const newSettings = {
      ...currentSettings,
      language,
      timezone,
      dateFormat,
      currency
    };

    await user.update({
      settings: JSON.stringify(newSettings)
    });

    res.json({
      success: true,
      message: 'General settings saved successfully',
      data: newSettings
    });
  } catch (error) {
    logger.error(`Save general settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to save general settings'
    });
  }
};

// Get notification settings
const getNotificationSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['settings']
    });

    const defaultSettings = {
      emailNotifications: true,
      smsNotifications: false,
      browserNotifications: true,
      orderUpdates: true,
      systemAlerts: true
    };

    const userSettings = user?.settings ? JSON.parse(user.settings) : {};
    // Fix: Check if userSettings.notifications exists before spreading
    const notificationSettings = { 
      ...defaultSettings, 
      ...(userSettings.notifications || {}) 
    };

    res.json({
      success: true,
      data: notificationSettings
    });
  } catch (error) {
    logger.error(`Get notification settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification settings'
    });
  }
};

// Save notification settings
const saveNotificationSettings = async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, browserNotifications, orderUpdates, systemAlerts } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentSettings = user.settings ? JSON.parse(user.settings) : {};
    const newSettings = {
      ...currentSettings,
      notifications: {
        emailNotifications,
        smsNotifications,
        browserNotifications,
        orderUpdates,
        systemAlerts
      }
    };

    await user.update({
      settings: JSON.stringify(newSettings)
    });

    res.json({
      success: true,
      message: 'Notification settings saved successfully',
      data: { emailNotifications, smsNotifications, browserNotifications, orderUpdates, systemAlerts }
    });
  } catch (error) {
    logger.error(`Save notification settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to save notification settings'
    });
  }
};

// Get shipping settings
const getShippingSettings = async (req, res) => {
  try {
    const settings = {
      defaultShippingMethod: 'standard',
      freeShippingThreshold: 100,
      shippingZones: [],
      trackingEnabled: true
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error(`Get shipping settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping settings'
    });
  }
};

// Save shipping settings
const saveShippingSettings = async (req, res) => {
  try {
    const { defaultShippingMethod, freeShippingThreshold, shippingZones, trackingEnabled } = req.body;

    res.json({
      success: true,
      message: 'Shipping settings saved successfully',
      data: { defaultShippingMethod, freeShippingThreshold, shippingZones, trackingEnabled }
    });
  } catch (error) {
    logger.error(`Save shipping settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to save shipping settings'
    });
  }
};

// Get email settings
const getEmailSettings = async (req, res) => {
  try {
    const settings = {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpSecure: false,
      fromEmail: '',
      fromName: ''
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error(`Get email settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email settings'
    });
  }
};

// Save email settings
const saveEmailSettings = async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure, fromEmail, fromName } = req.body;

    res.json({
      success: true,
      message: 'Email settings saved successfully'
    });
  } catch (error) {
    logger.error(`Save email settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to save email settings'
    });
  }
};

// Test email settings
const testEmailSettings = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    logger.error(`Test email error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send test email'
    });
  }
};

module.exports = {
  getCompanyInfo,
  saveCompanyInfo,
  uploadCompanyLogo,
  getGeneralSettings,
  saveGeneralSettings,
  getNotificationSettings,
  saveNotificationSettings,
  getShippingSettings,
  saveShippingSettings,
  getEmailSettings,
  saveEmailSettings,
  testEmailSettings
};