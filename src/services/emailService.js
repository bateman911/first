// src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter with improved configuration and error handling
const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports (like 587)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Add connection timeout and other options for better reliability
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // TLS configuration for better compatibility
    tls: {
        rejectUnauthorized: false, // Allow self-signed certificates if needed
        ciphers: 'SSLv3'
    },
    // Pool configuration for better connection management
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
});

// Verify SMTP configuration only when needed, not on module load
async function verifyTransporter() {
    try {
        await transporter.verify();
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
    // Verify transporter before sending
    const isVerified = await verifyTransporter();
    if (!isVerified) {
        throw new Error('SMTP транспортер не сконфигурирован правильно');
    }

    const mailOptions = {
        from: `"${process.env.APP_NAME || 'Hockey GM Support'}" <${process.env.SMTP_FROM_EMAIL}>`, // Отправитель
        to: process.env.SUPPORT_EMAIL_TO, // Получатель (ваша почта поддержки)
        replyTo: userEmail, // Чтобы ответ шел напрямую пользователю
        subject: `[Support Ticket] ${subject} (from ${userEmail})`, // Тема письма
        text: `Сообщение от пользователя: ${userEmail}\n\nТема: ${subject}\n\nСообщение:\n${message}`, // plain text body
        html: `
            <p><strong>Сообщение от пользователя:</strong> ${userEmail}</p>
            <p><strong>Тема:</strong> ${subject}</p>
            <hr>
            <p><strong>Сообщение:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><em>Это письмо отправлено из формы поддержки приложения ${process.env.APP_NAME || 'Hockey GM'}.</em></p>
        `, // html body
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Письмо поддержки успешно отправлено: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Ошибка при отправке письма поддержки:', error);
        throw error; // Перебрасываем ошибку для обработки в контроллере
    }
}

module.exports = {
    sendSupportEmail,
    verifyTransporter,
};