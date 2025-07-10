/**
 * Font Management Routes
 * Provides endpoints for font detection and validation
 */

const express = require('express');
const router = express.Router();
const FontManager = require('../utils/FontManager');
const logger = require('../utils/logger');

// Initialize FontManager instance
const fontManager = new FontManager();

/**
 * GET /api/fonts/available
 * Get list of available system fonts for use in templates
 */
router.get('/available', async (req, res) => {
  try {
    const fonts = await fontManager.getAvailableFonts();

    res.json({
      success: true,
      data: fonts,
      message: 'Available fonts retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get available fonts', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available fonts',
      error: error.message
    });
  }
});

/**
 * POST /api/fonts/validate-text
 * Validate if text can be properly rendered with selected font
 */
router.post('/validate-text', async (req, res) => {
  try {
    const { text, fontFamily, weight = 'normal' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text content is required'
      });
    }

    const validation = await fontManager.validateAndGetFont(
      text,
      fontFamily,
      weight
    );

    // Check for encoding issues
    const hasEncodingIssues =
      text.includes('�') || /[\uFFFD\uFEFF\u200B-\u200D\u2060]/.test(text);

    // Check for complex Unicode characters
    const hasComplexUnicode = /[^\u0000-\u00FF]/.test(text);

    // Suggest best font if different from requested
    const suggestedFont =
      validation.font !== fontFamily ? validation.font : null;

    res.json({
      success: true,
      data: {
        originalText: text,
        processedText: validation.text,
        requestedFont: fontFamily,
        recommendedFont: validation.font,
        fontChanged: suggestedFont !== null,
        hasEncodingIssues,
        hasComplexUnicode,
        suggestions: generateTextSuggestions(
          text,
          hasEncodingIssues,
          hasComplexUnicode
        )
      }
    });
  } catch (error) {
    logger.error('Text validation failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Text validation failed',
      error: error.message
    });
  }
});

/**
 * GET /api/fonts/detect-system
 * Detect and register system fonts (admin only)
 */
router.get('/detect-system', async (req, res) => {
  try {
    const detectedFonts = fontManager.detectSystemFonts();

    res.json({
      success: true,
      data: detectedFonts,
      message: 'System fonts detected successfully'
    });
  } catch (error) {
    logger.error('System font detection failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'System font detection failed',
      error: error.message
    });
  }
});

/**
 * Generate helpful suggestions for text encoding issues
 */
function generateTextSuggestions(text, hasEncodingIssues, hasComplexUnicode) {
  const suggestions = [];

  if (hasEncodingIssues) {
    suggestions.push({
      type: 'error',
      message:
        'Text contains replacement characters (�). Try re-entering the text or check your input source.',
      action: 'fix-encoding'
    });
  }

  if (hasComplexUnicode) {
    suggestions.push({
      type: 'info',
      message:
        'Text contains special characters. Using DejaVu Sans font for better compatibility.',
      action: 'font-recommendation'
    });
  }

  // Check for common Turkish characters
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) {
    suggestions.push({
      type: 'success',
      message:
        'Turkish characters detected. Font automatically optimized for Turkish text.',
      action: 'turkish-optimization'
    });
  }

  return suggestions;
}

module.exports = router;
