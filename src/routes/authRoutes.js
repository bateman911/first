const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport'); // Подключаем паспорт

router.post('/register', authController.register);
router.post('/login', authController.login);

// Роут для начала аутентификации через Google
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    // session: false // Если не используете сессии на сервере для OAuth потока
}));

// Роут обратного вызова (callback) от Google
router.get('/google/callback',
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
router.get('/login-failure', (req, res) => {
    // Можно редиректить на страницу входа с сообщением об ошибке
    // res.redirect('http://localhost:ВАШ_ФРОНТЕНД_ПОРТ/?error=google_auth_failed');
    res.status(401).send('Аутентификация через Google не удалась. Попробуйте снова. <a href="/">На главную</a>');
});

module.exports = router;