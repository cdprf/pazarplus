const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.emailEnabled = process.env.EMAIL_ENABLED === "true";
    this.emailProvider = process.env.EMAIL_PROVIDER || "console"; // console, smtp, sendgrid, etc.
    this.fromEmail = process.env.FROM_EMAIL || "noreply@pazarplus.com";
    this.fromName = process.env.FROM_NAME || "Pazar+ Platform";
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    const emailData = {
      to,
      from: `${this.fromName} <${this.fromEmail}>`,
      subject,
      html: htmlContent,
      text: textContent || this.htmlToText(htmlContent),
      timestamp: new Date().toISOString(),
    };

    try {
      if (!this.emailEnabled) {
        logger.info(
          "Email sending disabled - logging email instead:",
          emailData
        );
        return { success: true, messageId: "disabled", provider: "console" };
      }

      // For now, implement console logging as the primary method
      // This can be extended with actual email providers later
      return await this.sendEmailViaConsole(emailData);
    } catch (error) {
      logger.error("Email sending failed:", error);
      throw error;
    }
  }

  async sendEmailViaConsole(emailData) {
    logger.info("📧 EMAIL SENT (Console Mode):", {
      to: emailData.to,
      subject: emailData.subject,
      provider: "console",
    });

    console.log("\n" + "=".repeat(80));
    console.log("📧 EMAIL CONTENT");
    console.log("=".repeat(80));
    console.log(`To: ${emailData.to}`);
    console.log(`From: ${emailData.from}`);
    console.log(`Subject: ${emailData.subject}`);
    console.log("-".repeat(80));
    console.log(emailData.text || this.htmlToText(emailData.html));
    console.log("=".repeat(80) + "\n");

    return {
      success: true,
      messageId: `console_${Date.now()}`,
      provider: "console",
    };
  }

  async sendPasswordResetEmail(email, resetToken, userFirstName = "") {
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;

    const subject = "Reset Your Pazar+ Password";
    const htmlContent = this.generatePasswordResetHTML(resetUrl, userFirstName);
    const textContent = this.generatePasswordResetText(resetUrl, userFirstName);

    logger.info("Sending password reset email", {
      email,
      resetToken: resetToken.substring(0, 8) + "...",
    });

    return await this.sendEmail(email, subject, htmlContent, textContent);
  }

  async sendVerificationEmail(email, verificationToken, userFirstName = "") {
    const verificationUrl = `${this.baseUrl}/verify-email?token=${verificationToken}`;

    const subject = "Verify Your Pazar+ Email Address";
    const htmlContent = this.generateVerificationHTML(
      verificationUrl,
      userFirstName
    );
    const textContent = this.generateVerificationText(
      verificationUrl,
      userFirstName
    );

    logger.info("Sending verification email", {
      email,
      verificationToken: verificationToken.substring(0, 8) + "...",
    });

    return await this.sendEmail(email, subject, htmlContent, textContent);
  }

  generatePasswordResetHTML(resetUrl, firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">Reset Your Password</h1>
          <p>Hello ${firstName},</p>
          <p>We received a request to reset your password for your Pazar+ account. If you didn't make this request, please ignore this email.</p>
          <p>To reset your password, click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f1f2f6; padding: 10px; border-radius: 5px;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Pazar+ Team<br>
            <a href="mailto:support@pazarplus.com">support@pazarplus.com</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetText(resetUrl, firstName) {
    return `
Reset Your Password

Hello ${firstName},

We received a request to reset your password for your Pazar+ account. If you didn't make this request, please ignore this email.

To reset your password, please visit:
${resetUrl}

This link will expire in 1 hour for security reasons.

Best regards,
The Pazar+ Team
support@pazarplus.com
    `.trim();
  }

  generateVerificationHTML(verificationUrl, firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">Verify Your Email Address</h1>
          <p>Hello ${firstName},</p>
          <p>Thank you for signing up for Pazar+! To complete your registration, please verify your email address.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f1f2f6; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Pazar+ Team<br>
            <a href="mailto:support@pazarplus.com">support@pazarplus.com</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  generateVerificationText(verificationUrl, firstName) {
    return `
Verify Your Email Address

Hello ${firstName},

Thank you for signing up for Pazar+! To complete your registration, please verify your email address by visiting:

${verificationUrl}

This link will expire in 24 hours.

Best regards,
The Pazar+ Team
support@pazarplus.com
    `.trim();
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
