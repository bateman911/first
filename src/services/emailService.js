// src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Check if we're in a development environment without SMTP
const isDevelopmentWithoutSMTP = process.env.NODE_ENV === 'development' && process.env.SMTP_AVAILABLE !== 'true';

// Create a transporter with improved configuration
let transporter = null;

// Initialize transporter only when needed, not on module load
function getTransporter() {
  if (!transporter && !isDevelopmentWithoutSMTP) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: (process.env.SMTP_SECURE || 'false') === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
        // Add connection timeout settings
        connectionTimeout: 5000, // 5 seconds
        greetingTimeout: 5000,   // 5 seconds
        socketTimeout: 5000,     // 5 seconds
        // Disable TLS verification for development
        tls: {
          rejectUnauthorized: false
        },
        // Disable verification on startup
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      console.log("SMTP транспортер создан");
    } catch (error) {
      console.error("Ошибка при создании SMTP транспортера:", error.message);
      return null;
    }
  }
  return transporter;
}

/**
 * Verify SMTP configuration - only called when explicitly needed
 */
async function verifyTransporter() {
  if (isDevelopmentWithoutSMTP) {
    console.log("SMTP verification skipped in development mode without SMTP");
    return true;
  }

  try {
    const transport = getTransporter();
    if (!transport) {
      console.log("SMTP транспортер не инициализирован");
      return false;
    }
    
    await transport.verify();
    console.log("SMTP транспортер успешно сконфигурирован и готов к отправке писем.");
    return true;
  } catch (error) {
    console.error("Ошибка конфигурации SMTP транспортера:", error.message);
    console.log("Приложение продолжит работу без функции отправки email");
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
  // Skip email sending in development environment or when SMTP is not available
  if (isDevelopmentWithoutSMTP || process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
    console.log('Email sending skipped - development mode or missing SMTP configuration');
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
    // Only verify when actually sending and not in development
    const isVerified = await verifyTransporter();
    if (!isVerified) {
      console.warn('SMTP configuration failed verification, email not sent');
      return { messageId: 'smtp-unavailable', success: false, error: 'SMTP not available' };
    }
    
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log('Письмо поддержки успешно отправлено: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Ошибка при отправке письма поддержки:', error.message);
    // Don't throw the error, just return failure info
    return { messageId: 'send-failed', success: false, error: error.message };
  }
}

module.exports = {
  sendSupportEmail,
  verifyTransporter,
};