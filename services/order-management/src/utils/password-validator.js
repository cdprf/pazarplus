const passwordValidator = {
  /**
   * Validates password strength and returns detailed feedback
   * @param {string} password - The password to validate
   * @returns {Object} - Validation result with detailed feedback
   */
  validate(password) {
    const result = {
      isValid: true,
      errors: [],
      strength: 0
    };

    // Length check
    if (password.length < 8) {
      result.errors.push('Password must be at least 8 characters long');
      result.isValid = false;
    } else {
      result.strength += 20;
    }

    // Uppercase letter check
    if (!/[A-Z]/.test(password)) {
      result.errors.push('Password must contain at least one uppercase letter');
      result.isValid = false;
    } else {
      result.strength += 20;
    }

    // Lowercase letter check
    if (!/[a-z]/.test(password)) {
      result.errors.push('Password must contain at least one lowercase letter');
      result.isValid = false;
    } else {
      result.strength += 20;
    }

    // Number check
    if (!/\d/.test(password)) {
      result.errors.push('Password must contain at least one number');
      result.isValid = false;
    } else {
      result.strength += 20;
    }

    // Special character check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.errors.push('Password must contain at least one special character');
      result.isValid = false;
    } else {
      result.strength += 20;
    }

    // Additional checks for stronger passwords
    if (password.length >= 12) {
      result.strength += 10;
    }
    if (password.length >= 16) {
      result.strength += 10;
    }

    // Check for common patterns
    if (/123|abc|qwe|password|admin/i.test(password)) {
      result.errors.push('Password contains common patterns');
      result.strength -= 20;
      result.isValid = false;
    }

    // Ensure strength is between 0 and 100
    result.strength = Math.max(0, Math.min(100, result.strength));

    return result;
  },

  /**
   * Get password strength label based on score
   * @param {number} strength - Password strength score (0-100)
   * @returns {string} - Strength label
   */
  getStrengthLabel(strength) {
    if (strength >= 80) return 'Very Strong';
    if (strength >= 60) return 'Strong';
    if (strength >= 40) return 'Moderate';
    if (strength >= 20) return 'Weak';
    return 'Very Weak';
  },

  /**
   * Get color for password strength indicator
   * @param {number} strength - Password strength score (0-100)
   * @returns {string} - Color code
   */
  getStrengthColor(strength) {
    if (strength >= 80) return '#28a745'; // Green
    if (strength >= 60) return '#17a2b8'; // Blue
    if (strength >= 40) return '#ffc107'; // Yellow
    if (strength >= 20) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  }
};