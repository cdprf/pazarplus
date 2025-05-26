const express = require('express');
const router = express.Router();
const passwordValidator = require('../utils/password-validator');

/**
 * Validate password strength
 */
router.post('/validate-password', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  const validationResult = passwordValidator.validate(password);
  
  res.json({
    success: true,
    ...validationResult
  });
});

module.exports = router;