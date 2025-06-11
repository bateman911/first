// src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports (like 587)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Опционально: для TLS на порту 587, если secure: false
    // tls: {
    //     ciphers:'SSLv3' // Может понадобиться для некоторых конфигураций
    // }
});

transporter.verify(function(error, success) { // Проверка конфигурации SMTP
   if (error) {
        console.error("Ошибка конфигурации SMTP транспортера:", error);
   } else {
        console.log("SMTP транспортер успешно сконфигурирован и готов к отправке писем.");
   }
});

/**
 * Отправляет письмо поддержки.
 * @param {string} userEmail - Email пользователя, отправившего запрос.
 * @param {string} subject - Тема сообщения.
 * @param {string} message - Текст сообщения от пользователя.
 * @returns {Promise<object>} - Информация об отправленном письме или ошибка.
 */
async function sendSupportEmail(userEmail, subject, message) {
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
};