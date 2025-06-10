// public/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Элементы DOM
    const dashboardUsernameEl = document.getElementById('dashboardUsername');
    const teamLogoEl = document.getElementById('teamLogo');
    const teamLevelEl = document.getElementById('teamLevel');
    const xpBarFillEl = document.getElementById('xpBarFill');
    const xpTextEl = document.getElementById('xpText');
    const teamWinsEl = document.getElementById('teamWins');
    const teamLossesEl = document.getElementById('teamLosses');
    const teamDrawsEl = document.getElementById('teamDraws');
    const teamRatingEl = document.getElementById('teamRating');
    const goldAmountEl = document.getElementById('goldAmount');
    const bucksAmountEl = document.getElementById('bucksAmount');
    const energyBarEl = document.getElementById('energyBar');
    const energyTextEl = document.getElementById('energyText');
    const energyRefillTimerEl = document.getElementById('energyRefillTimer');

    const teamNameDisplayEl = document.getElementById('teamNameDisplay');
    const teamNameInputEl = document.getElementById('teamNameInput');
    const editTeamNameButton = document.getElementById('editTeamNameButton');
    const saveTeamNameButton = document.getElementById('saveTeamNameButton');
    const cancelEditTeamNameButton = document.getElementById('cancelEditTeamNameButton');
    const teamNameMessageEl = document.getElementById('teamNameMessage');
    const renameTeamCostInfoEl = document.getElementById('renameTeamCostInfo');

    const settingsButton = document.getElementById('settingsButton');
    const deleteTeamButton = document.getElementById('deleteTeamButton');
    const logoutButtonDashboard = document.getElementById('logoutButtonDashboard');
    const playButton = document.getElementById('playButton');
    const myTeamButton = document.getElementById('myTeamButton');
    const myCardsButton = document.getElementById('myCardsButton');

    const supportModal = document.getElementById('supportModal');
    const closeSupportModalButton = document.getElementById('closeSupportModal');
    const supportForm = document.getElementById('supportForm');
    const supportUserEmailEl = document.getElementById('supportUserEmail');
    const supportSubjectEl = document.getElementById('supportSubject');
    const supportMessageTextareaEl = document.getElementById('supportMessage');
    const supportFormMessageEl = document.getElementById('supportFormMessage');

    let originalTeamName = '';
    let energyTimerInterval;
    let currentUserData = null; 

    const TEAM_NAME_CHANGE_COST_COINS_FRONT = 100;
    const FREE_TEAM_NAME_CHANGES_LIMIT_FRONT = 1; // 1 бесплатная смена (т.е. когда changes_count = 0)

    function updateDashboardUI(data) {
        currentUserData = data; 

        if (teamNameDisplayEl) {
            originalTeamName = data.teamName || `${username || 'Player'}'s Team`;
            teamNameDisplayEl.textContent = originalTeamName;
            if (teamNameInputEl) teamNameInputEl.value = originalTeamName;
        }
        if (teamLogoEl && data.teamLogoUrl) teamLogoEl.src = data.teamLogoUrl;
        else if (teamLogoEl) teamLogoEl.src = 'images/logo.png'; // Запасной логотип

        if (teamLevelEl) teamLevelEl.textContent = data.level || 1;

        if (xpBarFillEl && xpTextEl) {
            const currentXp = data.currentXp || 0;
            const xpToNextLevel = data.xpToNextLevel || 100;
            const xpPercentage = (xpToNextLevel > 0) ? (currentXp / xpToNextLevel) * 100 : 0;
            xpBarFillEl.style.width = `${Math.min(xpPercentage, 100)}%`;
            xpTextEl.textContent = `${currentXp} / ${xpToNextLevel} XP`;
        }

        if (teamWinsEl) teamWinsEl.textContent = data.wins || 0;
        if (teamLossesEl) teamLossesEl.textContent = data.losses || 0;
        if (teamDrawsEl) teamDrawsEl.textContent = data.draws || 0;
        if (teamRatingEl) teamRatingEl.textContent = data.rating !== null && data.rating !== undefined ? data.rating : 'N/A';


        if (goldAmountEl) goldAmountEl.textContent = (data.gold || 0).toLocaleString();
        if (bucksAmountEl) bucksAmountEl.textContent = (data.bucks || 0).toLocaleString();

        const currentEnergy = data.currentEnergy || 0;
        const maxEnergy = data.maxEnergy || 7;
        renderEnergy(currentEnergy, maxEnergy);
        if (energyTextEl) energyTextEl.textContent = `${currentEnergy}/${maxEnergy}`;

        if (data.nextEnergyRefillAt && currentEnergy < maxEnergy) {
            startEnergyTimer(new Date(data.nextEnergyRefillAt));
        } else if (currentEnergy >= maxEnergy) {
            if (energyRefillTimerEl) energyRefillTimerEl.textContent = "(Full energy)";
            clearInterval(energyTimerInterval);
        } else {
            if (energyRefillTimerEl) energyRefillTimerEl.textContent = "(ожидание)";
        }

        if (supportUserEmailEl) {
            supportUserEmailEl.textContent = data.userEmail || localStorage.getItem('userEmail') || 'не указан';
        }
        updateRenameCostInfo();
    }

    async function loadDashboardData() {
        if (dashboardUsernameEl && username) dashboardUsernameEl.textContent = username;
        if (energyRefillTimerEl) energyRefillTimerEl.textContent = "(загрузка...)";
        if (renameTeamCostInfoEl) renameTeamCostInfoEl.textContent = "Загрузка стоимости...";


        try {
            const response = await fetch('/api/dashboard/team-status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('username');
                    localStorage.removeItem('userEmail');
                    window.location.href = 'index.html';
                    return;
                }
                throw new Error(`Ошибка сети: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            updateDashboardUI(data);
        } catch (error) {
            console.error("Ошибка загрузки данных дашборда:", error);
            if (teamRatingEl) teamRatingEl.textContent = "Ошибка";
            if (renameTeamCostInfoEl) renameTeamCostInfoEl.textContent = "Ошибка загрузки стоимости";
        }
    }

    function renderEnergy(current, max) {
        if (!energyBarEl) return;
        energyBarEl.innerHTML = '';
        for (let i = 0; i < max; i++) {
            const unit = document.createElement('div');
            unit.classList.add('energy-unit');
            if (i < current) unit.classList.add('filled');
            energyBarEl.appendChild(unit);
        }
    }

    function startEnergyTimer(nextRefillDateTarget) {
        if (!energyRefillTimerEl) return;
        clearInterval(energyTimerInterval);
        function updateTimerDisplay() {
            const now = new Date();
            const remainingMilliseconds = nextRefillDateTarget.getTime() - now.getTime();
            if (remainingMilliseconds <= 0) {
                energyRefillTimerEl.textContent = "(Обновление...)";
                clearInterval(energyTimerInterval);
                loadDashboardData();
                return;
            }
            const totalSeconds = Math.floor(remainingMilliseconds / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            energyRefillTimerEl.textContent = `(up energy via ${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')})`;
        }
        updateTimerDisplay();
        energyTimerInterval = setInterval(updateTimerDisplay, 1000);
    }
    
    function updateTeamNameMessage(message, type = 'info') {
        if (!teamNameMessageEl) return;
        teamNameMessageEl.textContent = message;
        teamNameMessageEl.className = 'form-message small-message'; 
        if (type) teamNameMessageEl.classList.add(type);
    }

    function updateRenameCostInfo() {
        if (!renameTeamCostInfoEl || !currentUserData || typeof currentUserData.team_name_changes_count === 'undefined') {
            if(renameTeamCostInfoEl && !currentUserData) renameTeamCostInfoEl.textContent = "Загрузка данных...";
            // Если currentUserData есть, но нет team_name_changes_count, это может быть проблемой на бэке
            else if (renameTeamCostInfoEl) renameTeamCostInfoEl.textContent = "Не удалось определить стоимость.";
            return;
        }
        // Преобразуем в число, на случай если с сервера пришла строка
        const changesCount = parseInt(currentUserData.team_name_changes_count, 10);

        if (changesCount < FREE_TEAM_NAME_CHANGES_LIMIT_FRONT) {
            renameTeamCostInfoEl.textContent = "Смена имени: Бесплатно";
        } else {
            renameTeamCostInfoEl.textContent = `Смена имени: ${TEAM_NAME_CHANGE_COST_COINS_FRONT} золота`;
        }
    }

    function setTeamNameEditMode(isEditing) {
        if (!teamNameDisplayEl || !teamNameInputEl || !editTeamNameButton || !saveTeamNameButton || !cancelEditTeamNameButton) return;
        
        teamNameDisplayEl.style.display = isEditing ? 'none' : 'inline-block';
        teamNameInputEl.style.display = isEditing ? 'inline-block' : 'none';
        editTeamNameButton.style.display = isEditing ? 'none' : 'inline-block';
        saveTeamNameButton.style.display = isEditing ? 'inline-block' : 'none';
        cancelEditTeamNameButton.style.display = isEditing ? 'inline-block' : 'none';

        if (isEditing) {
            teamNameInputEl.value = originalTeamName;
            teamNameInputEl.focus();
            teamNameInputEl.select();
        }
        updateTeamNameMessage('', '');
    }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
    if (logoutButtonDashboard) {
        logoutButtonDashboard.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail');
            window.location.href = 'index.html';
        });
    }
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            if (supportModal) {
                if (supportForm) supportForm.reset();
                if (supportFormMessageEl) updateSupportFormMessage('', '');
                supportModal.style.display = 'flex';
            }
        });
    }
    if (closeSupportModalButton) {
        closeSupportModalButton.addEventListener('click', () => {
            if (supportModal) supportModal.style.display = 'none';
        });
    }
    if (supportModal) {
        window.addEventListener('click', (event) => {
            if (event.target === supportModal) {
                supportModal.style.display = 'none';
            }
        });
    }
    if (supportForm && supportUserEmailEl && supportSubjectEl && supportMessageTextareaEl && supportFormMessageEl) {

        supportForm.addEventListener('submit', async (event) => {

            event.preventDefault();
            if (!supportFormMessageEl) return;

            const subject = supportSubjectEl.value;
            const message = supportMessageTextareaEl.value;
            // const userEmail = supportUserEmailEl.textContent; // Берем из отображаемого, что может быть не всегда актуально

            // Получаем актуальный email пользователя (например, из currentUserData, если оно заполнено)
            const userEmail = (currentUserData && currentUserData.userEmail) 
                               ? currentUserData.userEmail 
                               : (localStorage.getItem('userEmail') || supportUserEmailEl.textContent);


            updateSupportFormMessage('Отправка...', 'info');

            // ЗАКОММЕНТИРОВАННЫЙ ДЕМО-БЛОК:
            /*
            setTimeout(() => { 
                updateSupportFormMessage('Сообщение отправлено (демо)!', 'success');
                supportForm.reset();
                 setTimeout(() => { if (supportModal) supportModal.style.display = 'none'; updateSupportFormMessage('', ''); }, 2000);
            }, 1000);
            */

            // РЕАЛЬНАЯ ОТПРАВКА НА СЕРВЕР:
            try {

                const response = await fetch('/api/dashboard/submit-support-ticket', {
                    
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Важно для аутентификации
                    },
                    body: JSON.stringify({
                        subject: subject,
                        message: message,
                        userEmail: userEmail // Email, который пользователь видит/вводит (сервер может перепроверить)
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    updateSupportFormMessage(data.message || 'Сообщение успешно отправлено!', 'success');
                    supportForm.reset();
                    setTimeout(() => {
                        if (supportModal) supportModal.style.display = 'none';
                        updateSupportFormMessage('', ''); // Очистить сообщение после закрытия
                    }, 2500);
                } else {
                    updateSupportFormMessage(`Ошибка: ${data.message || response.statusText}`, 'error');
                }
            } catch (error) {
                console.error('Сетевая ошибка при отправке тикета:', error);
                updateSupportFormMessage('Сетевая ошибка. Пожалуйста, попробуйте позже.', 'error');
            }
        });
    }
    function updateSupportFormMessage(message, type = 'info') {
        if (!supportFormMessageEl) return;
        supportFormMessageEl.textContent = message;
        supportFormMessageEl.className = 'form-message';
        if (type) supportFormMessageEl.classList.add(type);
    }

    if (deleteTeamButton) {
        deleteTeamButton.addEventListener('click', () => { /* ... ваш код ... */ });
    }

    if (editTeamNameButton) {
        editTeamNameButton.addEventListener('click', () => {
            if (teamNameDisplayEl) originalTeamName = teamNameDisplayEl.textContent;
            setTeamNameEditMode(true);
        });
    }

    if (cancelEditTeamNameButton) {
        cancelEditTeamNameButton.addEventListener('click', () => {
            if (teamNameDisplayEl && teamNameInputEl) {
                teamNameDisplayEl.textContent = originalTeamName;
                teamNameInputEl.value = originalTeamName;
            }
            setTeamNameEditMode(false);
        });
    }

    if (saveTeamNameButton && teamNameInputEl) {
        saveTeamNameButton.addEventListener('click', async () => {
            const newName = teamNameInputEl.value.trim();

            if (newName === originalTeamName) {
                updateTeamNameMessage('Имя не изменилось.', 'info');
                setTeamNameEditMode(false);
                setTimeout(() => updateTeamNameMessage(''), 3000);
                return;
            }
            if (newName.length < 3 || newName.length > 50) {
                 updateTeamNameMessage('Имя команды: 3-50 симв.', 'error');
                 return;
            }

            updateTeamNameMessage('Сохранение...', 'info');
            saveTeamNameButton.disabled = true;
            cancelEditTeamNameButton.disabled = true;

            try {
                const response = await fetch('/api/team/rename', { // Убедитесь, что этот путь правильный
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    body: JSON.stringify({ newName: newName })
                });
                const data = await response.json();

                if (response.ok) {
                    updateTeamNameMessage(data.message || 'Имя команды обновлено!', 'success');
                    if (teamNameDisplayEl) teamNameDisplayEl.textContent = data.newTeamName;
                    originalTeamName = data.newTeamName;

                    if (currentUserData) {
                        currentUserData.teamName = data.newTeamName;
                        currentUserData.gold = data.gold;
                        // Используем значение, возвращенное сервером
                        if (typeof data.updated_team_name_changes_count !== 'undefined') {
                             currentUserData.team_name_changes_count = parseInt(data.updated_team_name_changes_count, 10);
                        } else {
                            console.error("Критическая ошибка: /api/team/rename не вернул updated_team_name_changes_count!");
                            // В этом случае, лучше перезапросить все данные, чтобы избежать рассинхрона
                            loadDashboardData(); // Это перезапишет currentUserData и вызовет updateRenameCostInfo
                        }
                    }
                    if (goldAmountEl) goldAmountEl.textContent = (data.gold || 0).toLocaleString();
                    updateRenameCostInfo(); // Обновляем на основе currentUserData
                    setTeamNameEditMode(false);
                } else {
                    updateTeamNameMessage(`Ошибка: ${data.message || response.statusText}`, 'error');
                }
            } catch (error) {
                console.error('Сетевая ошибка при смене имени команды:', error);
                updateTeamNameMessage('Сетевая ошибка. Попробуйте позже.', 'error');
            } finally {
                saveTeamNameButton.disabled = false;
                cancelEditTeamNameButton.disabled = false;
            }
        });
    }

    if (teamNameInputEl) {
        teamNameInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (saveTeamNameButton && !saveTeamNameButton.disabled) saveTeamNameButton.click();
            }
        });
        teamNameInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (cancelEditTeamNameButton && !cancelEditTeamNameButton.disabled) cancelEditTeamNameButton.click();
            }
        });
    }

    if (playButton) playButton.addEventListener('click', () => window.location.href = 'prepare-match.html');
    if (myTeamButton) myTeamButton.addEventListener('click', () => window.location.href = 'my-team.html');
    if (myCardsButton) myCardsButton.addEventListener('click', () => window.location.href = 'collection.html');

    loadDashboardData();
});