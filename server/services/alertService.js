const logger = require("../utils/logger");

class AlertService {
  constructor() {
    this.adminEmails = process.env.ADMIN_EMAILS?.split(",") || [
      "admin@pazarplus.com",
    ];
    this.alertQueue = [];
    this.webhookUrl = process.env.ADMIN_WEBHOOK_URL;
  }

  async sendAlert(type, title, message, data = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(type),
    };

    try {
      // Log the alert
      logger.warn(`Admin Alert [${type}]: ${title}`, {
        alert,
        adminEmails: this.adminEmails,
      });

      // Store in queue for processing
      this.alertQueue.push(alert);

      // Send via multiple channels
      await Promise.allSettled([
        this.sendEmailAlert(alert),
        this.sendWebhookAlert(alert),
        this.storeInDatabase(alert),
      ]);

      return { success: true, alertId: alert.id };
    } catch (error) {
      logger.error("Failed to send admin alert:", error);
      return { success: false, error: error.message };
    }
  }

  async sendEmailAlert(alert) {
    // Use the email service to send alert emails
    try {
      const emailService = require("./emailService");

      const subject = `[PAZAR+ ALERT] ${alert.title}`;
      const htmlContent = this.generateAlertEmailHTML(alert);

      // Send to all admin emails
      const emailPromises = this.adminEmails.map((email) =>
        emailService.sendEmail(email, subject, htmlContent)
      );

      const results = await Promise.allSettled(emailPromises);

      logger.info("Alert emails sent to administrators:", {
        alertId: alert.id,
        recipients: this.adminEmails,
        results: results.map((r, i) => ({
          email: this.adminEmails[i],
          status: r.status,
          success: r.status === "fulfilled" ? r.value.success : false,
        })),
      });

      return {
        status: "sent",
        recipients: this.adminEmails.length,
        successful: results.filter((r) => r.status === "fulfilled").length,
      };
    } catch (error) {
      logger.error("Failed to send alert emails:", error);
      return { status: "failed", error: error.message };
    }
  }

  async sendWebhookAlert(alert) {
    if (!this.webhookUrl)
      return { status: "skipped", reason: "No webhook URL configured" };

    try {
      // For now, just log the webhook payload
      logger.info("Webhook alert:", {
        url: this.webhookUrl,
        payload: alert,
      });
      return { status: "sent" };
    } catch (error) {
      logger.error("Webhook alert failed:", error);
      throw error;
    }
  }

  async storeInDatabase(alert) {
    try {
      // For now, just log to database log
      logger.info("Database alert stored:", alert);
      return { status: "stored" };
    } catch (error) {
      logger.error("Database alert storage failed:", error);
      throw error;
    }
  }

  getSeverity(type) {
    const severityMap = {
      platformWideIssue: "critical",
      connectionFailure: "high",
      dataInconsistency: "medium",
      performanceIssue: "medium",
      userError: "low",
    };
    return severityMap[type] || "medium";
  }

  async sendPlatformWideIssueAlert(data) {
    const title = `Platform-wide issue detected: ${data.platform || "Unknown"}`;
    const message = `
      A critical issue has been detected affecting platform operations.
      
      Platform: ${data.platform || "Unknown"}
      Issue Type: ${data.issueType || "Unknown"}
      Affected Services: ${data.affectedServices?.join(", ") || "Unknown"}
      Error Count: ${data.errorCount || 0}
      First Detected: ${data.firstDetected || new Date().toISOString()}
      
      Please investigate immediately.
    `;

    return this.sendAlert("platformWideIssue", title, message, data);
  }

  // Get recent alerts (for admin dashboard)
  getRecentAlerts(limit = 50) {
    return this.alertQueue
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Clear old alerts (cleanup)
  clearOldAlerts(maxAge = 7 * 24 * 60 * 60 * 1000) {
    // 7 days
    const cutoff = new Date(Date.now() - maxAge);
    this.alertQueue = this.alertQueue.filter(
      (alert) => new Date(alert.timestamp) > cutoff
    );
  }

  /**
   * Generate HTML email content for alerts
   * @param {Object} alert - The alert object
   * @returns {string} HTML content
   */
  generateAlertEmailHTML(alert) {
    const severityColors = {
      critical: "#e74c3c",
      high: "#f39c12",
      medium: "#f1c40f",
      low: "#3498db",
    };

    const severityColor = severityColors[alert.severity] || "#95a5a6";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pazar+ System Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${severityColor}; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚨 System Alert</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Pazar+ Platform Monitoring</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid ${severityColor};">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: ${severityColor}; margin-top: 0; border-bottom: 2px solid ${severityColor}; padding-bottom: 10px;">
              ${alert.title}
            </h2>
            
            <div style="margin: 20px 0;">
              <div style="display: inline-block; background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                ${alert.severity} Priority
              </div>
              <div style="display: inline-block; background: #ecf0f1; color: #34495e; padding: 4px 12px; border-radius: 15px; font-size: 12px; margin-left: 10px;">
                ${alert.type}
              </div>
            </div>
            
            <div style="background: #ecf0f1; padding: 15px; border-radius: 5px; border-left: 4px solid ${severityColor};">
              <h3 style="margin-top: 0; color: #2c3e50;">Alert Details:</h3>
              <p style="margin: 10px 0; white-space: pre-wrap;">${
                alert.message
              }</p>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #bdc3c7;">
              <p style="margin: 5px 0; font-size: 14px;"><strong>Alert ID:</strong> ${
                alert.id
              }</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Timestamp:</strong> ${new Date(
                alert.timestamp
              ).toLocaleString()}</p>
              ${
                alert.data && Object.keys(alert.data).length > 0
                  ? `
                <p style="margin: 5px 0; font-size: 14px;"><strong>Additional Data:</strong></p>
                <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${JSON.stringify(
                  alert.data,
                  null,
                  2
                )}</pre>
              `
                  : ""
              }
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              This alert was automatically generated by the Pazar+ monitoring system.<br>
              Please investigate this issue promptly.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            Pazar+ Platform | System Monitoring<br>
            <a href="mailto:support@pazarplus.com" style="color: ${severityColor};">support@pazarplus.com</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

// Create singleton instance
const alertService = new AlertService();

module.exports = alertService;
