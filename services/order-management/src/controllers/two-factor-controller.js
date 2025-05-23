const express = require('express');
const router = express.Router();
const twoFactorService = require('../services/two-factor.service');
const { authenticateToken } = require('../middleware/auth-middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * Generate 2FA secret and QR code
 */
router.post('/generate', async (req, res) => {
  try {
    const { email } = req.user;
    const { secret, qrCode } = await twoFactorService.generateSecret(email);
    
    // Store secret temporarily in session
    req.session.tempSecret = secret;
    
    res.json({
      success: true,
      qrCode,
      secret
    });
  } catch (error) {
    console.error('2FA generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating 2FA credentials'
    });
  }
});

/**
 * Enable 2FA for user
 */
router.post('/enable', async (req, res) => {
  try {
    const { token } = req.body;
    const secret = req.session.tempSecret;
    
    if (!secret) {
      return res.status(400).json({
        success: false,
        message: 'No 2FA secret found. Please generate new credentials.'
      });
    }
    
    const success = await twoFactorService.enable2FA(req.user.id, secret, token);
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    // Generate backup codes
    const backupCodes = twoFactorService.generateBackupCodes();
    
    // Save backup codes to user
    await req.user.update({
      backupCodes: JSON.stringify(backupCodes)
    });
    
    // Clear temporary secret
    delete req.session.tempSecret;
    
    res.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enabling 2FA'
    });
  }
});

/**
 * Verify 2FA token
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;
    
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this user'
      });
    }
    
    const isValid = twoFactorService.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    res.json({
      success: true,
      message: '2FA verification successful'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying 2FA token'
    });
  }
});

/**
 * Verify backup code
 */
router.post('/verify-backup', async (req, res) => {
  try {
    const { code } = req.body;
    const isValid = await twoFactorService.verifyBackupCode(req.user.id, code);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup code'
      });
    }
    
    res.json({
      success: true,
      message: 'Backup code verification successful'
    });
  } catch (error) {
    console.error('Backup code verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying backup code'
    });
  }
});

/**
 * Disable 2FA
 */
router.post('/disable', async (req, res) => {
  try {
    const success = await twoFactorService.disable2FA(req.user.id);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Error disabling 2FA'
      });
    }
    
    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling 2FA'
    });
  }
});

/**
 * Get new backup codes
 */
router.post('/backup-codes', async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA must be enabled to generate backup codes'
      });
    }
    
    const backupCodes = twoFactorService.generateBackupCodes();
    
    await user.update({
      backupCodes: JSON.stringify(backupCodes)
    });
    
    res.json({
      success: true,
      backupCodes
    });
  } catch (error) {
    console.error('Backup codes generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating backup codes'
    });
  }
});

module.exports = router;