// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const regMessage = document.getElementById('regMessage');
    const loginMessage = document.getElementById('loginMessage');
    const userInfoDiv = document.getElementById('userInfo');
    const logoutButton = document.getElementById('logoutButton');

    // Секции для скрытия/показа на странице входа/регистрации
    const registerSection = document.getElementById('registerSection');
    const loginSection = document.getElementById('loginSection');
    const formSeparator = document.getElementById('formSeparator');

    function updateMessage(element, text, type) {
        if (element) {
            element.textContent = text;
            element.className = 'form-message';
            if (type === 'success') {
                element.classList.add('success');
            } else if (type === 'error') {
                element.classList.add('error');
            } else if (type === 'warning') {
                element.classList.add('warning');
            }
        }
    }

    function handleSuccessfulLogin() {
        updateMessage(regMessage, '', '');
        updateMessage(loginMessage, '', '');
        window.location.href = 'dashboard.html';
    }

    function showLoggedOutState() {
        if (userInfoDiv) userInfoDiv.style.display = 'none';

        if(registerSection) registerSection.style.display = 'block';
        if(loginSection) loginSection.style.display = 'block';
        if(formSeparator) formSeparator.style.display = 'block';
    }

    // Проверка токена при загрузке страницы
    const token = localStorage.getItem('authToken');
    if (token) {
        window.location.href = 'dashboard.html';
    } else {
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
                console.error('Registration error:', error);
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
                    if (data.email) {
                        localStorage.setItem('userEmail', data.email);
                    }
                    handleSuccessfulLogin();
                } else {
                    updateMessage(loginMessage, `Ошибка: ${data.message}`, 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                updateMessage(loginMessage, 'Сетевая ошибка или ошибка сервера.', 'error');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail');
            showLoggedOutState();
            updateMessage(loginMessage, 'Вы вышли из системы.', 'success');
            updateMessage(regMessage, '', '');
        });
    }
});