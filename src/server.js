// src/server.js
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const cardRoutes = require('./routes/cardRoutes');
const passport = require('passport');
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const teamRoutes = require('./routes/teamRoutes');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db'); // Ваш модуль БД
const jwt = require('jsonwebtoken'); // Для генерации вашего JWT
const inventoryRoutes = require('./routes/inventoryRoutes');

require('dotenv').config(); // Загружаем переменные окружения
const TEAM_NAME_CHANGE_COST_COINS = 100;
const FREE_TEAM_NAME_CHANGES = 1; // Первая смена бесплатна (т.е. если changes_count < 1)

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON тел запросов
app.use(express.json());
// Middleware для парсинга URL-encoded тел запросов
app.use(express.urlencoded({ extended: true }));

// Initialize Passport BEFORE using it
app.use(passport.initialize());

// Configure Google Strategy BEFORE defining routes
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL, // Должен совпадать с тем, что в Google Console
        scope: ['profile', 'email'] // Запрашиваемые данные
    },
    async (accessToken, refreshToken, profile, done) => {
        // Эта функция вызывается после успешной аутентификации Google
        // profile содержит информацию о пользователе от Google
        // console.log('Google profile:', profile);

        try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (!email) {
                return done(new Error('Не удалось получить email от Google'), null);
            }

            // Проверяем, есть ли пользователь в нашей БД
            let userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            let user = userResult.rows[0];

            if (!user) {
                // Если пользователя нет, создаем нового
                // Google не предоставляет пароль, поэтому password_hash можно оставить пустым или сгенерировать случайный,
                // но тогда этому пользователю нужно будет запретить обычный вход по паролю,
                // или реализовать "привязку" Google аккаунта к существующему.
                // Для простоты, создадим пользователя.
                // Имя пользователя можно взять из profile.displayName или сгенерировать.
                const username = profile.displayName || email.split('@')[0]; // Простое имя пользователя

                // ВАЖНО: решить, как поступать с password_hash.
                // Вариант 1: Установить невалидный хеш, чтобы нельзя было войти по паролю.
                // Вариант 2: Добавить поле provider (e.g., 'google') и provider_id (profile.id) в таблицу users.
                //            Тогда для google-пользователей password_hash не нужен.
                // Рассмотрим Вариант 2 (более правильный).
                // Добавьте поля в таблицу users:
                // provider VARCHAR(50)
                // provider_id VARCHAR(255)
                // Сделайте email НЕ УНИКАЛЬНЫМ, если хотите разрешить и обычную регистрацию и Google с одним email.
                // Либо email должен быть уникальным, и тогда если пользователь уже есть с таким email (но не через Google),
                // нужно предложить ему "связать аккаунты". Это усложняет.
                // Для простоты MVP: email уникален. Если пользователь с таким email уже есть, логиним его.
                // Если email уникален, и нет пользователя, то создаем.

                const newUserResult = await db.query(
                    'INSERT INTO users (username, email, provider, provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
                    [username, email, 'google', profile.id]
                );
                user = newUserResult.rows[0];
            } else {
                // Пользователь найден. Можно обновить provider и provider_id, если их нет
                if (!user.provider || !user.provider_id) {
                    const updatedUser = await db.query(
                        'UPDATE users SET provider = $1, provider_id = $2 WHERE id = $3 RETURNING *',
                        ['google', profile.id, user.id]
                    );
                    user = updatedUser.rows[0];
                }
            }

            // Пользователь (существующий или новый) есть в user.
            // Теперь мы можем сгенерировать НАШ JWT токен для этого пользователя.
            const payload = {
                userId: user.id,
                username: user.username
                // Можно добавить email или другие данные в токен, если нужно
            };
            const appToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Передаем наш токен и профиль Google в callback для дальнейшей обработки (например, редиректа с токеном)
            return done(null, { appToken, profile });
        } catch (err) {
            return done(err, null);
        }
    }));

    // Add Google OAuth routes only when strategy is configured
    app.get('/api/auth/google', passport.authenticate('google', {
        scope: ['profile', 'email'],
        // session: false // Если не используете сессии на сервере для OAuth потока
    }));

    // Роут обратного вызова (callback) от Google
    app.get('/api/auth/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/login-failure', // Куда перенаправить при ошибке аутентификации Google
            session: false // Не создаем сессию на сервере после аутентификации
        }),
        (req, res) => {
            // req.user здесь будет объектом { appToken, profile } из функции done() в стратегии
            const token = req.user.appToken;
            const username = req.user.profile.displayName || req.user.profile.emails[0].value.split('@')[0];
            // Предположим, email тоже нужен на клиенте для формы поддержки
            const email = req.user.profile.emails[0].value;

            // Теперь нужно передать этот токен клиенту.
            // Способ 1: Редирект с токеном в параметре URL (менее безопасный, токен виден в истории)
            // res.redirect(`http://localhost:ВАШ_ФРОНТЕНД_ПОРТ/auth-success?token=${token}&username=${encodeURIComponent(username)}`);

            // Способ 2: Отправить HTML страницу, которая сохранит токен в localStorage и сделает редирект
            res.send(`
                <script>
                    localStorage.setItem('authToken', '${token}');
                    localStorage.setItem('username', '${username}');
                    localStorage.setItem('userEmail', '${email}'); // Сохраняем email
                    window.location.href = '/dashboard.html'; // Редирект на дашборд
                </script>
            `);
            // Способ 3 (для SPA): Если фронтенд и бэкенд на одном домене, можно установить cookie.
        }
    );

    // (Опционально) Роут для обработки неудачной аутентификации
    app.get('/login-failure', (req, res) => {
        // Можно редиректить на страницу входа с сообщением об ошибке
        // res.redirect('http://localhost:ВАШ_ФРОНТЕНД_ПОРТ/?error=google_auth_failed');
        res.status(401).send('Аутентификация через Google не удалась. Попробуйте снова. <a href="/">На главную</a>');
    });

} else {
    console.warn('⚠️  Google OAuth credentials not found in environment variables. Google authentication will be disabled.');
}

// Routes
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/team', teamRoutes);
app.use('/api/inventory', inventoryRoutes);

// Middleware для раздачи статических файлов (frontend)
app.use(express.static('public')); // Папка 'public' для HTML, CSS, JS клиента

// Подключение маршрутов аутентификации
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardRoutes);

// Простой корневой маршрут для проверки
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Отдаем главный HTML файл
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});