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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Добавляем информацию о пользователе в объект запроса
        next();
    } catch (error) {
        console.error('Ошибка верификации токена:', error.message);
        res.status(401).json({ message: 'Токен недействителен' });
    }
};