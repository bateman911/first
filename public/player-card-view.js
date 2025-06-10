// public/player-card-view.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Получение элементов DOM
    const playerCardDisplayFullEl = document.getElementById('playerCardDisplayFull');
    const playerSkillsContainerEl = document.getElementById('playerSkillsContainer');
    const availableBoostsContainerEl = document.getElementById('availableBoostsContainer');
    const appliedSkillsCountEl = document.getElementById('appliedSkillsCount');
    const addSkillButtonEl = document.getElementById('addSkillButton');
    const boostApplyMessageEl = document.getElementById('boostApplyMessage');

    const addSkillModalEl = document.getElementById('addSkillModal');
    const closeAddSkillModalButtonEl = document.getElementById('closeAddSkillModal');
    const cancelAddSkillButtonEl = document.getElementById('cancelAddSkill');
    const availableNewSkillsListEl = document.getElementById('availableNewSkillsList');
    const addSkillMessageEl = document.getElementById('addSkillMessage');

    const urlParams = new URLSearchParams(window.location.search);
    const userCardId = urlParams.get('userCardId');

    // Сопоставление скиллов и статов
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

    // Глобальные переменные состояния для страницы
    let currentPlayerCardMasterData = null; 
    let currentAppliedSkills = [];      
    let availableUserBoosts = [];       
    let allSkillTemplates = [];         

    let boostSelectionModal = null;      
    let skillToBoostData = null;       

    // --- Инициализация модальных окон ---
    function initializeModals() {
        if (document.getElementById('boostSelectionModal')) {
            boostSelectionModal = document.getElementById('boostSelectionModal');
            const closeBtn = boostSelectionModal.querySelector('#closeBoostModalInModal'); // Используем новый ID
            if (closeBtn) closeBtn.onclick = () => { boostSelectionModal.style.display = 'none'; };
            const cancelBtn = boostSelectionModal.querySelector('#cancelBoostSelectionInModal'); // Используем новый ID
            if (cancelBtn) cancelBtn.onclick = () => { boostSelectionModal.style.display = 'none'; };
        } else {
            const modalDiv = document.createElement('div');
            modalDiv.id = 'boostSelectionModal';
            modalDiv.classList.add('modal'); 
            modalDiv.style.display = 'none'; 
            modalDiv.innerHTML = `
                <div class="modal-content" style="background-color: #2c3e50; color: #e0e0e0; max-width: 600px;">
                    <span class="close-button" id="closeBoostModalInModal">×</span> 
                    <h3>Выберите буст для улучшения скилла: <span id="skillNameToBoostInModal"></span></h3>
                    <div id="modalBoostList" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;">
                        <p>Загрузка подходящих бустов...</p>
                    </div>
                    <button id="cancelBoostSelectionInModal" class="btn btn-secondary">Отмена</button>
                </div>
            `;
            document.body.appendChild(modalDiv);
            boostSelectionModal = modalDiv;
            boostSelectionModal.querySelector('#closeBoostModalInModal').onclick = () => { boostSelectionModal.style.display = 'none'; };
            boostSelectionModal.querySelector('#cancelBoostSelectionInModal').onclick = () => { boostSelectionModal.style.display = 'none'; };
        }
        
        if (closeAddSkillModalButtonEl) closeAddSkillModalButtonEl.onclick = () => { if(addSkillModalEl) addSkillModalEl.style.display = 'none'; };
        if (cancelAddSkillButtonEl) cancelAddSkillButtonEl.onclick = () => { if(addSkillModalEl) addSkillModalEl.style.display = 'none'; };
        
        window.addEventListener('click', (event) => {
            if (addSkillModalEl && event.target === addSkillModalEl) {
                addSkillModalEl.style.display = 'none';
            }
            if (boostSelectionModal && event.target === boostSelectionModal) {
                 boostSelectionModal.style.display = 'none';
            }
        });
    }
    initializeModals();

    // --- Расчет и отображение данных ---
    function calculateOvrFromDetailedStats(detailedModifiedStats, cardPosition) {
        let ovrSum = 0;
        let ovrCount = 0;
        let relevantStatsForOvrCalc;

        if (cardPosition === 'Goaltender') {
            relevantStatsForOvrCalc = ['base_reflexes', 'base_puck_control', 'base_positioning', 'base_stamina', 'base_speed'];
        } else { 
            relevantStatsForOvrCalc = [
                'base_skating', 'base_shooting', 'base_passing', 
                'base_defense_skill', 'base_physical', 'base_puck_control',
                'base_attack', 'base_defense', 'base_speed', 'base_stamina'
            ];
        }
        
        relevantStatsForOvrCalc.forEach(statKey => {
            if (typeof detailedModifiedStats[statKey] === 'number') {
                ovrSum += detailedModifiedStats[statKey];
                ovrCount++;
            }
        });
        
        const calculatedOvr = ovrCount > 0 ? Math.round(ovrSum / ovrCount) : 0;
        return calculatedOvr;
    }
    
    function calculateModifiedStats(baseCardData, appliedSkills) {
        if (!baseCardData) return { current_ovr: 0 };
        // console.log("calculateModifiedStats: Base Card Data", JSON.parse(JSON.stringify(baseCardData)));
        // console.log("calculateModifiedStats: Applied Skills", JSON.parse(JSON.stringify(appliedSkills)));
        
        const modifiedStats = {};
        const allPossibleBaseStatKeys = [
            'base_attack', 'base_defense', 'base_speed', 'base_stamina', 
            'base_skating', 'base_shooting', 'base_passing', 'base_defense_skill', 
            'base_physical', 'base_reflexes', 'base_puck_control', 'base_positioning', 'base_ovr'
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
        // console.log("calculateModifiedStats: Stats after skill boosts", JSON.parse(JSON.stringify(modifiedStats)));
        // console.log("calculateModifiedStats: Calculated OVR", modifiedStats.current_ovr);
        return modifiedStats;
    }

    function displayFullPlayerCard(cardData) {
        if (!playerCardDisplayFullEl || !cardData) return;

        const modifiedStats = calculateModifiedStats(cardData, currentAppliedSkills);

        let displayTier = 'bronze';
        const ovrForTierCalc = modifiedStats.current_ovr; 
        
        if (ovrForTierCalc >= 95) displayTier = 'legendary';
        else if (ovrForTierCalc >= 90) displayTier = 'epic';
        else if (ovrForTierCalc >= 75) displayTier = 'gold';
        else if (ovrForTierCalc >= 55) displayTier = 'silver';
        
        let statsHtml = '';
        const statDisplayOrder = [
            'base_attack', 'base_defense', 'base_speed', 'base_stamina', 
            'base_skating', 'base_shooting', 'base_passing', 'base_defense_skill', 
            'base_physical','base_puck_control',
            'base_reflexes', 'base_positioning' 
        ];

        statDisplayOrder.forEach(statKey => {
            if (typeof modifiedStats[statKey] === 'number') {
                const baseValue = cardData[statKey] || 0; // Базовое значение из исходных данных карты
                const modifiedValue = modifiedStats[statKey];
                const diff = modifiedValue - baseValue;
                const statLabel = statKey.replace('base_', '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                
                let showStat = true;
                const cardPos = cardData.position; // Используем позицию из cardData
                if (cardPos === 'Goaltender') {
                    if (!['base_reflexes', 'base_puck_control', 'base_positioning', 'base_stamina', 'base_speed'].includes(statKey)) {
                        showStat = false;
                    }
                } else { // Полевой
                    if (['base_reflexes', 'base_positioning'].includes(statKey)) {
                        showStat = false;
                    }
                }

                if (showStat) {
                    statsHtml += `
                        <div class="stat-item">
                            <span class="stat-label">${statLabel}:</span> 
                            <span class="stat-value">${modifiedValue} ${diff > 0 ? `<span style="color:lightgreen;">(+${diff})</span>` : (diff < 0 ? `<span style="color:pink;">(${diff})</span>` : '')}</span>
                        </div>`;
                }
            }
        });

        playerCardDisplayFullEl.innerHTML = `
            <div class="game-card tier-${displayTier}">
                <div class="card-header"> <span class="player-name">${cardData.player_name || 'N/A'}</span> <div class="player-meta-info"> <span class="player-ovr">OVR: ${modifiedStats.current_ovr}</span> <span class="player-level">Ур. ${cardData.current_level || 1}</span> </div> </div>
                <div class="card-image-container"> <img src="images/cards/${cardData.image_url || 'placeholder.png'}" alt="${cardData.player_name || 'Player'}" class="player-image" onerror="this.src='images/cards/placeholder.png'; this.onerror=null;"> </div>
                <div class="card-body"> <div class="player-position">${cardData.position || 'N/A'}</div> ${cardData.rarity ? `<div class="player-rarity">${cardData.rarity}</div>` : ''} <div class="player-stats">${statsHtml}</div> </div>
                <div class="card-footer">ID карты: ${cardData.user_card_id}</div>
            </div>`;
        // currentPlayerCardMasterData хранит базовые данные, его не перезаписываем здесь modifiedStats
    }

    function displayAppliedSkills(skills) {
        if (!playerSkillsContainerEl || !appliedSkillsCountEl) return;
        playerSkillsContainerEl.innerHTML = '';
        currentAppliedSkills = skills || [];
        appliedSkillsCountEl.textContent = currentAppliedSkills.length;

        if (currentAppliedSkills.length === 0) {
            playerSkillsContainerEl.innerHTML = '<p>У этого игрока пока нет прокачанных скиллов.</p>';
        } else {
            currentAppliedSkills.forEach(skill => {
                const skillDiv = document.createElement('div');
                skillDiv.classList.add('skill-slot');
                skillDiv.innerHTML = `
                    <strong>${skill.skill_name || 'Неизвестный скилл'}</strong>
                    <p>Очки буста: ${skill.boost_points_added || 0}</p>
                    <small>${skill.skill_description || ''}</small>
                    <br>
                    <button class="btn btn-small btn-primary btn-apply-boost-to-skill" data-skill-template-id="${skill.skill_template_id}" data-skill-name="${skill.skill_name || ''}" style="margin-top: 10px;">
                        <i class="fas fa-angle-double-up"></i> Улучшить
                    </button>
                `;
                playerSkillsContainerEl.appendChild(skillDiv);
            });
        }
        if (addSkillButtonEl) {
            addSkillButtonEl.style.display = currentAppliedSkills.length < 4 ? 'inline-block' : 'none';
        }
        document.querySelectorAll('.btn-apply-boost-to-skill').forEach(button => {
            button.removeEventListener('click', handleImproveSkillClick);
            button.addEventListener('click', handleImproveSkillClick);
        });
    }
    
    function handleImproveSkillClick(event) {
        const button = event.currentTarget;
        const skillTemplateIdToBoost = button.dataset.skillTemplateId;
        const skillNameToBoost = button.dataset.skillName;
        
        skillToBoostData = { id: skillTemplateIdToBoost, name: skillNameToBoost };

        const skillNameEl = document.getElementById('skillNameToBoostInModal'); 
        if (skillNameEl) skillNameEl.textContent = skillNameToBoost || 'Выбранный скилл';
        
        populateBoostSelectionModal();
        if (boostSelectionModal) boostSelectionModal.style.display = 'flex';
    }

    function populateBoostSelectionModal() {
        const modalBoostList = document.getElementById('modalBoostList');
        if (!modalBoostList || !skillToBoostData || !skillToBoostData.id) {
            if(modalBoostList) modalBoostList.innerHTML = '<p>Ошибка: Не выбран скилл для улучшения.</p>';
            return;
        }
        modalBoostList.innerHTML = '<p>Поиск подходящих бустов...</p>';

        if (!availableUserBoosts || availableUserBoosts.length === 0) {
            modalBoostList.innerHTML = '<p>У вас нет бустов в инвентаре.</p>';
            return;
        }

        const targetSkillTemplateId = skillToBoostData.id;
        const suitableBoosts = availableUserBoosts.filter(b => 
            b.target_skill_template_id && 
            b.target_skill_template_id.toString() === targetSkillTemplateId.toString()
        );
        
        if (suitableBoosts.length === 0) {
            modalBoostList.innerHTML = `<p>Нет подходящих бустов для улучшения скилла "${skillToBoostData.name || ''}".</p>`;
            return;
        }

        modalBoostList.innerHTML = ''; 
        suitableBoosts.forEach(boost => {
            const boostDiv = document.createElement('div');
            boostDiv.classList.add('boost-item'); 
            boostDiv.style.display = 'flex';    
            boostDiv.style.justifyContent = 'space-between';
            boostDiv.style.alignItems = 'center';
            boostDiv.style.marginBottom = '10px'; 

            boostDiv.innerHTML = `
                <div style="text-align: left;">
                    <strong>${boost.boost_name || 'Буст'}</strong> (${boost.boost_quality})
                    <p style="font-size:0.9em; margin:2px 0;">+${boost.boost_points_value} очков</p>
                    <p style="font-size:0.8em; color:#a0b0d0;">В наличии: ${boost.quantity}</p>
                </div>
                <button class="btn btn-small btn-success apply-this-boost-btn" 
                        data-user-boost-inventory-id="${boost.user_boost_inventory_id}"
                        style="white-space: nowrap;">
                    Применить
                </button>
            `;
            boostDiv.querySelector('.apply-this-boost-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const userBoostInvId = e.target.dataset.userBoostInventoryId;
                applyBoostToSkill(skillToBoostData.id, userBoostInvId); 
                if (boostSelectionModal) boostSelectionModal.style.display = 'none';
            });
            modalBoostList.appendChild(boostDiv);
        });
    }

    function displayAvailableBoosts(boosts) {
        if (!availableBoostsContainerEl) return;
        availableBoostsContainerEl.innerHTML = '';
        availableUserBoosts = boosts || [];

        if (availableUserBoosts.length === 0) {
            availableBoostsContainerEl.innerHTML = '<p>У вас нет доступных бустов в инвентаре.</p>';
            return;
        }
        availableUserBoosts.forEach(boost => {
            const boostDiv = document.createElement('div');
            boostDiv.classList.add('boost-item');
            boostDiv.style.cursor = 'default'; 
            boostDiv.innerHTML = `
                <strong>${boost.boost_name || 'Неизвестный буст'}</strong> 
                <p>Качество: ${boost.boost_quality}</p>
                <p>+${boost.boost_points_value} к ${boost.target_skill_name || 'скиллу'}</p>
                <p>В наличии: ${boost.quantity}</p>
            `;
            availableBoostsContainerEl.appendChild(boostDiv);
        });
    }
    
    async function applyBoostToSkill(skillTemplateIdToBoost, userBoostInventoryId) {
        if (!currentPlayerCardMasterData || !skillTemplateIdToBoost || !userBoostInventoryId) {
            updateBoostMessageEl("Ошибка: Недостаточно данных для применения буста.", "error");
            return;
        }
        updateBoostMessageEl("Применение буста...", "info");
        try {
            const response = await fetch(`/api/inventory/player-cards/${currentPlayerCardMasterData.user_card_id}/apply-boost`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    skill_template_id_to_boost: parseInt(skillTemplateIdToBoost),
                    user_boost_inventory_id: parseInt(userBoostInventoryId)
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                updateBoostMessageEl(data.message || "Буст успешно применен!", "success");
                await fetchPlayerSkills(); 
                await fetchUserBoosts();   
                if (currentPlayerCardMasterData) { 
                    displayFullPlayerCard(currentPlayerCardMasterData); 
                }
            } else { 
                updateBoostMessageEl(`Ошибка: ${data.message || response.statusText}`, "error");
            }
        } catch (error) {
            console.error("Ошибка применения буста:", error);
            updateBoostMessageEl("Сетевая ошибка при применении буста.", "error");
        }
    }
    
    async function fetchAllSkillTemplates() {
        try {
            const response = await fetch('/api/inventory/all-skill-templates', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Не удалось загрузить шаблоны скиллов');
            allSkillTemplates = await response.json();
        } catch (error) {
            console.error("Ошибка загрузки шаблонов скиллов:", error);
            if(addSkillMessageEl) updateMessage(addSkillMessageEl, "Ошибка загрузки списка скиллов.", "error");
        }
    }

    if (addSkillButtonEl) {
        addSkillButtonEl.addEventListener('click', () => {
            if (!currentPlayerCardMasterData) {
                alert("Данные карты игрока не загружены."); return;
            }
            if (currentAppliedSkills.length >= 4) {
                alert("У игрока уже максимум скиллов."); return;
            }
            populateAddSkillModal();
            if (addSkillModalEl) addSkillModalEl.style.display = 'flex';
            if (addSkillMessageEl) updateMessage(addSkillMessageEl, "", "");
        });
    }

    function populateAddSkillModal() {
        if (!availableNewSkillsListEl || !currentPlayerCardMasterData) return;
        availableNewSkillsListEl.innerHTML = '<p>Загрузка...</p>';

        const playerPosition = currentPlayerCardMasterData.position;
        if (!playerPosition) {
            availableNewSkillsListEl.innerHTML = '<p>Ошибка: позиция игрока не определена.</p>';
            return;
        }
        const playerRole = playerPosition === 'Goaltender' ? 'Goaltender' : 'Field';
        const existingSkillTemplateIds = new Set(currentAppliedSkills.map(s => s.skill_template_id.toString()));

        const availableForAdding = allSkillTemplates.filter(template => {
            return !existingSkillTemplateIds.has(template.id.toString()) &&
                   (template.applicable_to_role === 'All' || template.applicable_to_role === playerRole);
        });

        if (availableForAdding.length === 0) {
            availableNewSkillsListEl.innerHTML = '<p>Нет доступных скиллов для добавления (все подходящие уже есть или нет подходящих для роли).</p>';
            return;
        }
        
        availableNewSkillsListEl.innerHTML = ''; 
        availableForAdding.forEach(template => {
            const skillDiv = document.createElement('div');
            skillDiv.classList.add('boost-item'); 
            skillDiv.style.cursor = 'pointer';
            skillDiv.innerHTML = `
                <strong>${template.name}</strong>
                <p><small>${template.description || ''}</small></p>
            `;
            skillDiv.addEventListener('click', () => {
                confirmAddSkill(template.id, template.name);
            });
            availableNewSkillsListEl.appendChild(skillDiv);
        });
    }

    async function confirmAddSkill(skillTemplateId, skillName) {
        if (!currentPlayerCardMasterData || !skillTemplateId) {
            updateMessage(addSkillMessageEl, "Ошибка: Недостаточно данных для добавления скилла.", "error");
            return;
        }
        if (!confirm(`Добавить скилл "${skillName}" этому игроку? (Начальные очки: 0)`)) {
            return;
        }

        if (addSkillMessageEl) updateMessage(addSkillMessageEl, `Добавление скилла ${skillName}...`, "info");
        if (addSkillModalEl) addSkillModalEl.style.display = 'none'; 

        try {
            const response = await fetch(`/api/inventory/player-cards/${currentPlayerCardMasterData.user_card_id}/add-skill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ skill_template_id_to_add: parseInt(skillTemplateId) })
            });
            const data = await response.json();

            if (response.ok) {
                updateMessage(addSkillMessageEl, data.message || `Скилл ${skillName} успешно добавлен!`, "success");
                await fetchPlayerSkills(); 
                if (currentPlayerCardMasterData) { 
                    displayFullPlayerCard(currentPlayerCardMasterData);
                }
            } else {
                updateMessage(addSkillMessageEl, `Ошибка: ${data.message || response.statusText}`, "error");
            }
        } catch (error) {
            console.error("Сетевая ошибка при добавлении скилла:", error);
            updateMessage(addSkillMessageEl, "Сетевая ошибка при добавлении скилла.", "error");
        }
    }
    
    function updateBoostMessageEl(message, type = "info") {
        if (boostApplyMessageEl) {
            boostApplyMessageEl.textContent = message;
            boostApplyMessageEl.className = 'form-message';
            if (type) boostApplyMessageEl.classList.add(type);
        }
    }
    function updateMessage(element, text, type) {
        if (element) {
            element.textContent = text;
            element.className = 'form-message';
            if (type) element.classList.add(type);
        }
    }

    async function fetchCardMasterData() {
        try {
            const cardsResponse = await fetch('/api/cards/my-cards', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!cardsResponse.ok) throw new Error(`HTTP error! status: ${cardsResponse.status}`);
            const allCards = await cardsResponse.json();
            if (!Array.isArray(allCards)) throw new Error('Данные карт не являются массивом');
            const cardToDisplay = allCards.find(c => c.user_card_id && c.user_card_id.toString() === userCardId);
            if (cardToDisplay) {
                currentPlayerCardMasterData = { ...cardToDisplay }; // Сохраняем копию базовых данных
                // displayFullPlayerCard(currentPlayerCardMasterData); // Вызываем после загрузки ВСЕХ данных в loadPageData
            } else {
                if (playerCardDisplayFullEl) playerCardDisplayFullEl.innerHTML = `<p class="form-message error">Карта с ID ${userCardId} не найдена.</p>`;
                return false;
            }
            return true;
        } catch (error) {
            console.error("Ошибка загрузки мастер-данных карты:", error);
            if (playerCardDisplayFullEl) playerCardDisplayFullEl.innerHTML = `<p class="form-message error">Ошибка загрузки данных: ${error.message}</p>`;
            return false;
        }
    }

    async function fetchPlayerSkills() {
        if (!playerSkillsContainerEl) return;
        playerSkillsContainerEl.innerHTML = '<p>Загрузка скиллов...</p>';
        try {
            const skillsResponse = await fetch(`/api/inventory/player-cards/${userCardId}/skills`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!skillsResponse.ok) {
                const errData = await skillsResponse.json().catch(() => ({message: `HTTP error! status: ${skillsResponse.status}`}));
                throw new Error(errData.message);
            }
            const skills = await skillsResponse.json();
            currentAppliedSkills = skills || [];
            displayAppliedSkills(currentAppliedSkills); 
        } catch (error) {
            console.error("Ошибка загрузки скиллов:", error);
            playerSkillsContainerEl.innerHTML = `<p class="form-message error">Ошибка загрузки скиллов: ${error.message}</p>`;
            currentAppliedSkills = []; 
            displayAppliedSkills(currentAppliedSkills); 
        }
    }

    async function fetchUserBoosts() {
        if (!availableBoostsContainerEl) return;
        availableBoostsContainerEl.innerHTML = '<p>Загрузка бустов...</p>';
        try {
            const boostsResponse = await fetch('/api/inventory/my-boosts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!boostsResponse.ok) {
                 const errData = await boostsResponse.json().catch(() => ({message: `HTTP error! status: ${boostsResponse.status}`}));
                throw new Error(errData.message);
            }
            const boosts = await boostsResponse.json();
            availableUserBoosts = boosts || []; 
            displayAvailableBoosts(availableUserBoosts);
        } catch (error) {
            console.error("Ошибка загрузки бустов:", error);
            availableBoostsContainerEl.innerHTML = `<p class="form-message error">Ошибка загрузки бустов: ${error.message}</p>`;
            availableUserBoosts = []; 
            displayAvailableBoosts(availableUserBoosts);
        }
    }

    async function loadPageData() {
        if (!userCardId) {
            if (playerCardDisplayFullEl) playerCardDisplayFullEl.innerHTML = '<p class="form-message error">Ошибка: ID карты игрока не указан в URL.</p>';
            return;
        }
        const cardFound = await fetchCardMasterData(); 
        if (cardFound && currentPlayerCardMasterData) {
            await fetchAllSkillTemplates(); 
            await Promise.all([
                fetchPlayerSkills(), 
                fetchUserBoosts()   
            ]);
            displayFullPlayerCard(currentPlayerCardMasterData); 
        }
    }
    loadPageData();
});