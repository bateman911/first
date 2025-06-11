// src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Check if SMTP is configured
const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

let transporter;

if (isSmtpConfigured) {
    transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    transporter.verify(function(error, success) {
        if (error) {
            console.error("⚠️  SMTP configuration error:", error.message);
            console.log("📧 Email functionality will be disabled");
        } else {
            console.log("✅ SMTP transporter configured successfully");
        }
    });
} else {
    console.log("📧 SMTP not configured - email functionality disabled");
    transporter = null;
}

/**
 * Отправляет письмо поддержки.
 */
async function sendSupportEmail(userEmail, subject, message) {
    if (!transporter) {
        console.log("📧 Email not sent - SMTP not configured");
        // Return success to not break the application flow
        return { messageId: 'mock-message-id', info: 'SMTP not configured' };
    }

    const mailOptions = {
        from: `"${process.env.APP_NAME || 'Hockey GM Support'}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: process.env.SUPPORT_EMAIL_TO,
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
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Support email sent successfully: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error sending support email:', error);
        throw error;
    }
}

module.exports = {
    sendSupportEmail,
};