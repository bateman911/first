// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Нет токена, авторизация отклонена' });
    }

    // Токен обычно передается в формате "Bearer <token>"
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Некорректный формат токена' });
    }
    const token = tokenParts[1];

    try {
        // Use a default secret key if not provided in environment
        const secretKey = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded; // Добавляем информацию о пользователе в объект запроса
        next();
    } catch (error) {
        console.error('Ошибка верификации токена:', error.message);
        
        // Provide more specific error messages
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Токен истек. Пожалуйста, войдите снова.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Недействительный токен. Пожалуйста, войдите снова.' });
        }
        
        res.status(401).json({ message: 'Токен недействителен' });
    }
};