// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const regMessage = document.getElementById('regMessage');
    const loginMessage = document.getElementById('loginMessage');
    // Элементы userInfoDiv, loggedInUsernameSpan, userActionsDiv больше не нужны на этой странице,
    // так как мы будем сразу перенаправлять. Оставим logoutButton для общей логики, хотя он тоже не будет виден.
    const userInfoDiv = document.getElementById('userInfo');
    const logoutButton = document.getElementById('logoutButton');


    // Секции для скрытия/показа на странице входа/регистрации
    const registerSection = document.getElementById('registerSection');
    const loginSection = document.getElementById('loginSection');
    const formSeparator = document.getElementById('formSeparator');


    function updateMessage(element, text, type) {
        if (element) { // Проверяем, существует ли элемент перед обращением к нему
            element.textContent = text;
            element.className = 'form-message'; // Сброс классов
            if (type === 'success') {
                element.classList.add('success');
            } else if (type === 'error') {
                element.classList.add('error');
            }
        }
    }

    // Эта функция теперь будет очень простой: только редирект
    function handleSuccessfulLogin() {
        // Очистка сообщений перед редиректом (необязательно, т.к. страница сменится)
        updateMessage(regMessage, '', '');
        updateMessage(loginMessage, '', '');
        window.location.href = 'dashboard.html'; // <-- ОСНОВНОЕ ИЗМЕНЕНИЕ
    }

    // Эта функция по-прежнему нужна для отображения форм, если пользователь не залогинен
    // или после выхода.
    function showLoggedOutState() {
        if (userInfoDiv) userInfoDiv.style.display = 'none'; // Скрываем старую панель пользователя

        // Показываем формы регистрации и входа
        if(registerSection) registerSection.style.display = 'block';
        if(loginSection) loginSection.style.display = 'block';
        if(formSeparator) formSeparator.style.display = 'block';
    }


    // Проверка, есть ли токен при загрузке страницы index.html
    const token = localStorage.getItem('authToken');
    if (token) {
        // Если токен есть, сразу пытаемся перейти на дашборд.
        // Дашборд сам проверит валидность токена и при необходимости вернет на index.html
        window.location.href = 'dashboard.html';
    } else {
        // Если токена нет, показываем формы входа/регистрации
        showLoggedOutState();
    }


    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            updateMessage(regMessage, '', '');
            updateMessage(loginMessage, '', '');
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    updateMessage(regMessage, 'Успешная регистрация! Теперь вы можете войти.', 'success');
                    registerForm.reset();
                } else {
                    updateMessage(regMessage, `Ошибка: ${data.message}`, 'error');
                }
            } catch (error) {
                updateMessage(regMessage, 'Сетевая ошибка или ошибка сервера.', 'error');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            updateMessage(loginMessage, '', '');
            updateMessage(regMessage, '', '');

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('username', data.username);
                    // Сохраняем email, если он приходит от сервера при обычном логине
                    // (Вам нужно убедиться, что ваш /api/auth/login эндпоинт возвращает email)
                    if (data.email) { // Предполагаем, что сервер возвращает email
                        localStorage.setItem('userEmail', data.email);
                    }
                    handleSuccessfulLogin(); // Вызываем новую функцию для редиректа
                    // loginForm.reset(); // Необязательно, т.к. страница сменится
                } else {
                    updateMessage(loginMessage, `Ошибка: ${data.message}`, 'error');
                }
            } catch (error) {
                updateMessage(loginMessage, 'Сетевая ошибка или ошибка сервера.', 'error');
            }
        });
    }

    // Кнопка logoutButton на странице index.html больше не имеет смысла,
    // так как пользователь будет на dashboard.html, если залогинен.
    // Если вы хотите оставить ее для какого-то редкого случая, когда пользователь оказался на index.html с токеном,
    // то ее обработчик должен просто удалять токен и вызывать showLoggedOutState.
    // Но лучше, чтобы dashboard.js обрабатывал выход.
    // Если все же нужно:
    if (logoutButton) {
        logoutButton.addEventListener('click', () => { // Этот обработчик скорее всего не понадобится здесь
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail'); // Также удаляем email
            showLoggedOutState();
            updateMessage(loginMessage, 'Вы вышли из системы.', 'success');
            updateMessage(regMessage, '', '');
        });
    }
});