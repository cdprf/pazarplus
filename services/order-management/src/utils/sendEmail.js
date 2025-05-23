const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendEmail = async (options) => {
  try {
    // Create reusable transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Define email options
    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    };

    // Send mail with defined transport object
    const info = await transporter.sendMail(message);

    logger.info(`Email sent: ${info.messageId}`);
  } catch (error) {
    logger.error(`Email sending failed: ${error.message}`);
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
