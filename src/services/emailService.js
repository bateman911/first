// src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter with improved configuration
let transporter = null;

// Initialize transporter only when needed, not on module load
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: (process.env.SMTP_SECURE || 'false') === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      // Add connection timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,   // 10 seconds
      socketTimeout: 10000,     // 10 seconds
      // Disable TLS verification for development
      tls: {
        rejectUnauthorized: false
      },
      // Disable verification on startup
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return transporter;
}

/**
 * Verify SMTP configuration - only called when explicitly needed
 */
async function verifyTransporter() {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log("SMTP транспортер успешно сконфигурирован и готов к отправке писем.");
    return true;
  } catch (error) {
    console.error("Ошибка конфигурации SMTP транспортера:", error.message);
    return false;
  }
}

/**
 * Отправляет письмо поддержки.
 * @param {string} userEmail - Email пользователя, отправившего запрос.
 * @param {string} subject - Тема сообщения.
 * @param {string} message - Текст сообщения от пользователя.
 * @returns {Promise<object>} - Информация об отправленном письме или ошибка.
 */
async function sendSupportEmail(userEmail, subject, message) {
  // Skip email sending in development environment
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
    console.log('Email sending skipped in development mode or missing SMTP configuration');
    console.log(`Would send email to: ${process.env.SUPPORT_EMAIL_TO || 'support@example.com'}`);
    console.log(`From: ${userEmail}, Subject: ${subject}, Message: ${message}`);
    return { messageId: 'dev-mode-skip', success: true };
  }

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Hockey GM Support'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: process.env.SUPPORT_EMAIL_TO || 'support@example.com',
    replyTo: userEmail,
    subject: `[Support Ticket] ${subject} (from ${userEmail})`,
    text: `Сообщение от пользователя: ${userEmail}\n\nТема: ${subject}\n\nСообщение:\n${message}`,
    html: `
      <p><strong>Сообщение от пользователя:</strong> ${userEmail}</p>
      <p><strong>Тема:</strong> ${subject}</p>
      <hr>
      <p><strong>Сообщение:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><em>Это письмо отправлено из формы поддержки приложения ${process.env.APP_NAME || 'Hockey GM'}.</em></p>
    `,
  };

  try {
    // Only verify when actually sending
    const isVerified = await verifyTransporter();
    if (!isVerified) {
      console.warn('SMTP configuration failed verification, but attempting to send anyway');
    }
    
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log('Письмо поддержки успешно отправлено: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Ошибка при отправке письма поддержки:', error);
    throw error;
  }
}

module.exports = {
  sendSupportEmail,
  verifyTransporter,
};