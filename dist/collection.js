// public/collection.js
document.addEventListener('DOMContentLoaded', () => {
    const cardCollectionDiv = document.getElementById('cardCollection');
    const loadingMessage = document.getElementById('loadingMessage');
    const getStarterPackButton = document.getElementById('getStarterPackButton');
    const starterPackMessage = document.getElementById('starterPackMessage');
    const logoutButton = document.getElementById('logoutButtonCollection');

    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');

    if (getStarterPackButton) {
        getStarterPackButton.style.display = 'none';
    }

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    if (username && logoutButton) {
        logoutButton.style.display = 'inline-block';
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail'); // Также удаляем email, если он там был
            window.location.href = 'index.html';
        });
    }

    // --- КОПИРУЕМ ЛОГИКУ РАСЧЕТА СТАТОВ И OVR ИЗ player-card-view.js ---
    const SKILL_TO_STAT_MAP = {
        'Shot': ['base_shooting', 'base_attack'],
        'Pass': ['base_passing'],
        'Skate': ['base_speed', 'base_skating'],
        'Stick Handle': ['base_puck_control'],
        'Defend': ['base_defense', 'base_defense_skill'],
        'Reaction': ['base_reflexes'],
        'Recovery': ['base_stamina'],
        'Hands': ['base_puck_control']
    };

    function calculateOvrFromDetailedStats(detailedModifiedStats, cardPosition) {
        let ovrSum = 0;
        let ovrCount = 0;
        let relevantStatsForOvrCalc;
        if (cardPosition === 'Goaltender') {
            relevantStatsForOvrCalc = ['base_reflexes', 'base_puck_control', 'base_positioning', 'base_stamina', 'base_speed'];
        } else {
            relevantStatsForOvrCalc = [
                'base_skating', 'base_shooting', 'base_passing', 'base_defense_skill',
                'base_physical', 'base_puck_control', 'base_attack', 'base_defense',
                'base_speed', 'base_stamina'
            ];
        }
        relevantStatsForOvrCalc.forEach(statKey => {
            if (typeof detailedModifiedStats[statKey] === 'number') {
                ovrSum += detailedModifiedStats[statKey];
                ovrCount++;
            }
        });
        return ovrCount > 0 ? Math.round(ovrSum / ovrCount) : 0;
    }

    function calculateModifiedStats(baseCardData, appliedSkills) {
        if (!baseCardData) return { current_ovr: (baseCardData && baseCardData.base_ovr) || 0 };
        
        const modifiedStats = {};
        const allPossibleBaseStatKeys = [
            'base_attack', 'base_defense', 'base_speed', 'base_stamina', 'base_skating', 
            'base_shooting', 'base_passing', 'base_defense_skill', 'base_physical', 
            'base_reflexes', 'base_puck_control', 'base_positioning', 'base_ovr'
        ];
        allPossibleBaseStatKeys.forEach(key => {
            modifiedStats[key] = (typeof baseCardData[key] === 'number') ? baseCardData[key] : 0;
        });

        if (appliedSkills && appliedSkills.length > 0) {
            appliedSkills.forEach(skill => {
                const pointsToAdd = skill.boost_points_added || 0;
                const affectedStatKeys = SKILL_TO_STAT_MAP[skill.skill_name];
                if (affectedStatKeys && pointsToAdd > 0) {
                    affectedStatKeys.forEach(statKey => {
                        if (typeof modifiedStats[statKey] === 'number') {
                            modifiedStats[statKey] += pointsToAdd;
                        } else {
                            modifiedStats[statKey] = pointsToAdd;
                        }
                    });
                }
            });
        }
        modifiedStats.current_ovr = calculateOvrFromDetailedStats(modifiedStats, baseCardData.position);
        return modifiedStats; // Возвращаем все модифицированные статы, включая current_ovr
    }
    // --- КОНЕЦ КОПИРОВАНИЯ ЛОГИКИ РАСЧЕТА ---


    async function checkStarterPackStatus() {
        // ... (ваш существующий код) ...
        if (!getStarterPackButton) return; 
        try {
            const response = await fetch('/api/cards/starter-pack-status', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                getStarterPackButton.style.display = data.canReceiveStarterPack ? 'block' : 'none';
            } else {
                console.error('Ошибка при проверке статуса стартового набора:', response.statusText);
                starterPackMessage.textContent = 'Не удалось проверить доступность стартового набора.';
            }
        } catch (error) {
            console.error('Сетевая ошибка при проверке статуса стартового набора:', error);
            starterPackMessage.textContent = 'Сетевая ошибка при проверке статуса набора.';
        }
    }

    async function fetchUserCards() {
        try {
            loadingMessage.textContent = 'Загрузка карт...';
            cardCollectionDiv.innerHTML = '';

            const response = await fetch('/api/cards/my-cards', { // Этот эндпоинт теперь возвращает карты с полем applied_skills
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const cardsWithSkills = await response.json(); 
                loadingMessage.textContent = '';
                if (cardsWithSkills.length === 0) {
                    cardCollectionDiv.innerHTML = '<p>У вас пока нет карт.</p>';
                } else {
                    displayCards(cardsWithSkills);
                }
            } else if (response.status === 401) {
                // ... (обработка 401)
                alert('Сессия истекла или токен недействителен. Пожалуйста, войдите снова.');
                localStorage.removeItem('authToken');
                localStorage.removeItem('username');
                localStorage.removeItem('userEmail');
                window.location.href = 'index.html';
            } else {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                loadingMessage.textContent = `Ошибка загрузки карт: ${errorData.message}`;
            }
        } catch (error) {
            console.error('Ошибка при загрузке карт:', error);
            loadingMessage.textContent = 'Сетевая ошибка или ошибка сервера при загрузке карт.';
        }
    }

    function displayCards(cards) { // cards теперь это cardsWithSkills
        cardCollectionDiv.innerHTML = '';
        cards.forEach(cardData => { // cardData теперь содержит поле applied_skills
            const cardElement = document.createElement('div');
            cardElement.classList.add('game-card');

            // Рассчитываем модифицированный OVR и другие статы для отображения
            const modifiedStats = calculateModifiedStats(cardData, cardData.applied_skills || []);
            const displayOvr = modifiedStats.current_ovr;

            let displayTier = 'bronze';
            if (displayOvr >= 95) displayTier = 'legendary';
            else if (displayOvr >= 90) displayTier = 'epic';
            else if (displayOvr >= 75) displayTier = 'gold';
            else if (displayOvr >= 55) displayTier = 'silver';
            cardElement.classList.add(`tier-${displayTier}`);

            if (cardData.rarity && typeof cardData.rarity === 'string') {
                cardElement.classList.add(`rarity-${cardData.rarity.toLowerCase()}`);
            }
            if (cardData.position && typeof cardData.position === 'string') {
                cardElement.classList.add(`position-${cardData.position.toLowerCase().replace(' ', '-')}`);
            }
            
            cardElement.dataset.userCardId = cardData.user_card_id;
            cardElement.style.cursor = 'pointer';
            cardElement.addEventListener('click', () => {
                window.location.href = `player-card-view.html?userCardId=${cardData.user_card_id}`;
            });

            // Отображаем модифицированные статы (или только OVR, по вашему выбору)
            // Для простоты, на странице коллекции можно показывать только модифицированный OVR,
            // а детальные модифицированные статы - на странице player-card-view.html.
            // Но если хотите, можно и здесь их отобразить.
            cardElement.innerHTML = `
                <div class="card-header">
                    <span class="player-name">${cardData.player_name || 'N/A'}</span>
                    <div class="player-meta-info">
                        <span class="player-ovr">OVR: ${displayOvr}</span> <!-- ИСПОЛЬЗУЕМ displayOvr -->
                        <span class="player-level">Ур. ${cardData.current_level || 1}</span>
                    </div>
                </div>
                <div class="card-image-container">
                    <img src="images/cards/${cardData.image_url || 'placeholder.png'}" alt="${cardData.player_name || 'Player'}" class="player-image" onerror="this.src='images/cards/placeholder.png'; this.onerror=null;">
                </div>
                <div class="card-body">
                    <div class="player-position">${cardData.position || 'N/A'}</div>
                    ${cardData.rarity ? `<div class="player-rarity">${cardData.rarity}</div>` : ''}
                    <div class="player-stats">
                        <div class="stat-item"><span class="stat-label">Атака:</span> <span class="stat-value">${modifiedStats.base_attack}</span></div>
                        <div class="stat-item"><span class="stat-label">Защита:</span> <span class="stat-value">${modifiedStats.base_defense}</span></div>
                        <div class="stat-item"><span class="stat-label">Скорость:</span> <span class="stat-value">${modifiedStats.base_speed}</span></div>
                        <div class="stat-item"><span class="stat-label">Выносливость:</span> <span class="stat-value">${modifiedStats.base_stamina}</span></div>
                        <!-- Можно добавить отображение бонусов (+X) и здесь, если хотите -->
                    </div>
                </div>
            `;
            cardCollectionDiv.appendChild(cardElement);
        });
    }

    if (getStarterPackButton) {
        getStarterPackButton.addEventListener('click', async () => {
            // ... (ваш существующий код) ...
             starterPackMessage.textContent = 'Получение набора...';
            starterPackMessage.style.color = 'inherit'; 

            try {
                const response = await fetch('/api/cards/starter-pack', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await response.json();
                if (response.ok) {
                    starterPackMessage.textContent = data.message;
                    starterPackMessage.style.color = 'green';
                    getStarterPackButton.style.display = 'none'; 
                    fetchUserCards(); 
                } else {
                    starterPackMessage.textContent = `Ошибка: ${data.message || response.statusText}`;
                    starterPackMessage.style.color = 'red';
                    if (response.status === 400) {
                        getStarterPackButton.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Ошибка при получении стартового набора:', error);
                starterPackMessage.textContent = 'Сетевая ошибка или ошибка сервера.';
                starterPackMessage.style.color = 'red';
            }
        });
    }

    checkStarterPackStatus().then(() => {
        fetchUserCards();
    });
});