const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Initialize transporter with environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendVerificationEmail(user, token) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@pazar.plus',
        to: user.email,
        subject: 'Verify your email address',
        html: `
          <h1>Welcome to Pazar+</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link will expire in 24 hours.</p>
        `
      });

      logger.info(`Verification email sent to ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Error sending verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(user, token) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@pazar.plus',
        to: user.email,
        subject: 'Reset your password',
        html: `
          <h1>Password Reset</h1>
          <p>You requested to reset your password. Click the link below to set a new password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

      logger.info(`Password reset email sent to ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendTestEmail(to) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@pazar.plus',
        to: to,
        subject: 'Test Email from Pazar+',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email from your Pazar+ instance.</p>
          <p>If you received this email, your email settings are configured correctly.</p>
        `
      });

      logger.info(`Test email sent to ${to}`);
      return true;
    } catch (error) {
      logger.error('Error sending test email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();