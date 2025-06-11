// src/controllers/authController.js
const db = require('../db'); // db now exports { query: ... }
const bcrypt = require('bcryptjs'); // Changed from bcrypt to bcryptjs
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Все поля обязательны' });
    }

    try {
        // Проверка, существует ли пользователь
        const existingUserResult = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        if (existingUserResult.rows.length > 0) {
            return res.status(409).json({ message: 'Пользователь с таким email или username уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUserResult = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: newUserResult.rows[0]
        });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ message: 'Ошибка сервера при регистрации' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email и пароль обязательны' });
    }
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Успешный вход',
            token,
            userId: user.id,
            username: user.username,
            email: user.email // Added to return email for client storage
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ message: 'Ошибка сервера при входе' });
    }
};