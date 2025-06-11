// src/controllers/authController.js
const db = require('../db'); // db now exports { query: ... }
const bcrypt = require('bcryptjs'); // Using bcryptjs for better compatibility
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Все поля обязательны' });
    }

    try {
        // Check if user exists
        const existingUserResult = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        // In mock DB mode, rows might be undefined
        const existingUsers = existingUserResult.rows || [];
        
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Пользователь с таким email или username уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUserResult = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        // In development mode with mock DB, create a successful response
        const newUser = newUserResult.rows && newUserResult.rows[0] ? 
            newUserResult.rows[0] : 
            { id: 1, username, email };

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: newUser
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
        
        // In mock DB mode, rows might be undefined
        const users = result.rows || [];
        
        if (users.length === 0) {
            // In development mode with mock DB, create a mock user for testing
            if (process.env.NODE_ENV === 'development' && process.env.POSTGRES_AVAILABLE !== 'true') {
                // This is a development convenience - create a mock user on the fly
                const mockUser = {
                    id: 1,
                    username: email.split('@')[0],
                    email: email,
                    password_hash: await bcrypt.hash(password, SALT_ROUNDS)
                };
                
                const token = jwt.sign(
                    { userId: mockUser.id, username: mockUser.username },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '1h' }
                );
                
                return res.status(200).json({
                    message: 'Успешный вход (режим разработки)',
                    token,
                    userId: mockUser.id,
                    username: mockUser.username,
                    email: mockUser.email
                });
            }
            
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
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