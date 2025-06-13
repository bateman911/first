// public/my-team.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const availableCardsContainer = document.getElementById('availableCardsContainer');
    const rosterSlots = document.querySelectorAll('.roster-slot');
    const saveTeamButton = document.getElementById('saveTeamButton');
    const teamFormMessage = document.getElementById('teamFormMessage');
    const cardFilterButtons = document.querySelectorAll('.card-filters .filter-btn');
    const cardFilterPositionSpan = document.getElementById('cardFilterPosition');
    const teamChemistryPointsEl = document.getElementById('teamChemistryPoints');
    const chemistryBonusMsgEl = document.getElementById('chemistryBonusMessage');

    let allUserCards = []; // Все карты пользователя, загруженные с сервера
    let currentRosterMap = {}; // { "LW": {cardData}, "C": null, ... } - хранит ПОЛНЫЕ данные карт в слотах
    let initialRosterStateForSave = {}; // Для отслеживания изменений { "LW": user_card_id, "C": user_card_id2, ... }
    let draggedItem = null; // { id, element, source, originalSlotPosition }

    function makeCardDraggable(cardElement, source, originalSlotPosition = null) {
        cardElement.removeEventListener('dragstart', onDragStartCard); 
        cardElement.removeEventListener('dragend', onDragEndCard);   
        
        cardElement.dataset.dragSource = source;
        cardElement.dataset.dragOriginalSlot = originalSlotPosition || '';

        if (source === 'available' && cardElement.classList.contains('assigned')) {
            cardElement.setAttribute('draggable', 'false');
        } else {
            cardElement.setAttribute('draggable', 'true'); 
        }
        
        cardElement.addEventListener('dragstart', onDragStartCard);
        cardElement.addEventListener('dragend', onDragEndCard);
    }

    function onDragStartCard(e) {
        const cardElement = e.currentTarget;
        if (cardElement.classList.contains('player-card-placeholder') ||
            (cardElement.dataset.dragSource === 'available' && cardElement.classList.contains('assigned'))) {
            e.preventDefault(); return;
        }
        draggedItem = {
            id: cardElement.dataset.usercardid,
            element: cardElement,
            source: cardElement.dataset.dragSource,
            originalSlotPosition: cardElement.dataset.dragOriginalSlot || null
        };
        e.dataTransfer.setData('text/plain', draggedItem.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            if (draggedItem && cardElement === draggedItem.element) {
                 cardElement.classList.add('dragging');
            }
        }, 0);
    }

    function onDragEndCard(e) {
        if (e.currentTarget) {
            e.currentTarget.classList.remove('dragging');
        }
        // Сброс draggedItem происходит в drop обработчиках
    }

    rosterSlots.forEach(slot => {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedItem && isCardSuitableForSlot(draggedItem.id, slot.dataset.position)) {
                e.dataTransfer.dropEffect = 'move';
                slot.classList.add('drag-over');
            } else {
                e.dataTransfer.dropEffect = 'none';
                slot.classList.remove('drag-over');
            }
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
        slot.addEventListener('drop', handleDropOnSlot);
    });

    if (availableCardsContainer) {
        availableCardsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedItem && draggedItem.source === 'roster') {
                e.dataTransfer.dropEffect = 'move';
                availableCardsContainer.classList.add('drag-over-available');
            } else {
                e.dataTransfer.dropEffect = 'none';
            }
        });
        availableCardsContainer.addEventListener('dragleave', () => availableCardsContainer.classList.remove('drag-over-available'));
        availableCardsContainer.addEventListener('drop', handleDropOnAvailableList);
    }

    function handleDropOnSlot(event) {
        event.preventDefault();
        const targetSlotElement = event.currentTarget;
        targetSlotElement.classList.remove('drag-over');

        if (!draggedItem) { draggedItem = null; return; }

        const targetSlotPosition = targetSlotElement.dataset.position;
        const droppedCardId = draggedItem.id;
        // Ищем данные перетаскиваемой карты в allUserCards, так как там "мастер-данные"
        const droppedCardMasterData = allUserCards.find(c => c.user_card_id.toString() === droppedCardId);

        if (!droppedCardMasterData) {
            console.error("Drop_Slot: Master data for dropped card not found:", droppedCardId);
            draggedItem = null; return;
        }

        if (!isCardSuitableForSlot(droppedCardId, targetSlotPosition)) {
            updateTeamFormMessage(`Карта '${droppedCardMasterData.player_name}' (${droppedCardMasterData.position}) не подходит для ${targetSlotPosition}.`, 'error');
            draggedItem = null; return;
        }

        const cardPreviouslyInTargetSlotData = currentRosterMap[targetSlotPosition] ? { ...currentRosterMap[targetSlotPosition] } : null;
        const sourceSlotPosition = draggedItem.source === 'roster' ? draggedItem.originalSlotPosition : null;

        if (sourceSlotPosition === targetSlotPosition) {
            draggedItem = null; return;
        }
        
        let cardToPlaceInSourceSlot = null;

        if (cardPreviouslyInTargetSlotData && cardPreviouslyInTargetSlotData.user_card_id.toString() !== droppedCardId) {
            if (sourceSlotPosition && sourceSlotPosition !== targetSlotPosition) {
                // Для isCardSuitableForSlot нужна "родная" позиция карты, берем ее из cardPreviouslyInTargetSlotData.card_actual_position
                if (isCardSuitableForSlot(cardPreviouslyInTargetSlotData.user_card_id.toString(), sourceSlotPosition)) {
                    cardToPlaceInSourceSlot = cardPreviouslyInTargetSlotData;
                }
            }
        }

        if (sourceSlotPosition && sourceSlotPosition !== targetSlotPosition) {
            currentRosterMap[sourceSlotPosition] = null;
        }
        
        // В currentRosterMap кладем объект, структура которого соответствует тому, что приходит с бэка для ростера
        // то есть, 'родная' позиция должна быть в card_actual_position
        currentRosterMap[targetSlotPosition] = { 
            ...droppedCardMasterData, // Берем все данные из мастер-списка
            field_position: targetSlotPosition, // Добавляем полевую позицию
            card_actual_position: droppedCardMasterData.position // Явно указываем "родную" позицию
        };


        if (cardToPlaceInSourceSlot && sourceSlotPosition) {
             // Аналогично, формируем объект для currentRosterMap
            const sourceCardMasterData = allUserCards.find(c => c.user_card_id.toString() === cardToPlaceInSourceSlot.user_card_id.toString());
            if (sourceCardMasterData) {
                currentRosterMap[sourceSlotPosition] = {
                    ...sourceCardMasterData,
                    field_position: sourceSlotPosition,
                    card_actual_position: sourceCardMasterData.position
                };
            } else {
                 currentRosterMap[sourceSlotPosition] = null; // Если не нашли мастер-данные, лучше очистить
            }
        }
        
        rerenderAllBasedOnState();
        updateTeamFormMessage('', '');
        draggedItem = null;
    }

    function handleDropOnAvailableList(event) {
        event.preventDefault();
        availableCardsContainer.classList.remove('drag-over-available');
        if (!draggedItem || draggedItem.source !== 'roster') {
            draggedItem = null; return;
        }

        const originalSlotPosition = draggedItem.originalSlotPosition;
        if (originalSlotPosition && currentRosterMap[originalSlotPosition] && currentRosterMap[originalSlotPosition].user_card_id.toString() === draggedItem.id) {
            currentRosterMap[originalSlotPosition] = null;
        }
        
        rerenderAllBasedOnState();
        draggedItem = null;
    }
    
    function getRoleForFieldPosition(fieldPosition) {
        if (['LW', 'C', 'RW'].includes(fieldPosition)) return 'Forward';
        if (['LD', 'RD'].includes(fieldPosition)) return 'Defenseman';
        if (fieldPosition === 'G') return 'Goaltender';
        return null;
    }
    
    function rerenderAllBasedOnState() {
        rosterSlots.forEach(slotElement => {
            const positionOnField = slotElement.dataset.position;
            const cardDataFromMap = currentRosterMap[positionOnField];
            
            slotElement.innerHTML = '';
            const positionLabelSpan = document.createElement('span');
            positionLabelSpan.classList.add('position-label');
            positionLabelSpan.textContent = positionOnField;
            slotElement.appendChild(positionLabelSpan);

            if (cardDataFromMap && cardDataFromMap.user_card_id) {
                const cardDataForElement = { ...cardDataFromMap, current_slot_position_for_drag: positionOnField };
                const smallCardElement = createSmallCardElement(cardDataForElement, true);
                
                // cardDataFromMap.card_actual_position должно содержать "родную" позицию карты (Forward, Defenseman, Goaltender)
                const nativeCardPositionRole = cardDataFromMap.card_actual_position; 
                const fieldPositionRole = getRoleForFieldPosition(positionOnField);

                if (nativeCardPositionRole && fieldPositionRole && nativeCardPositionRole === fieldPositionRole) {
                    smallCardElement.style.boxShadow = '0 0 5px 2px lightgreen';
                    smallCardElement.title = "Игрок на своей позиции (+1 к сыгранности)";
                } else {
                    smallCardElement.style.boxShadow = 'none';
                    smallCardElement.title = "";
                }
                slotElement.appendChild(smallCardElement);
            } else {
                const placeholder = document.createElement('div');
                placeholder.classList.add('player-card-placeholder');
                placeholder.dataset.usercardid = "";
                placeholder.textContent = 'Перетащите карту';
                slotElement.appendChild(placeholder);
            }
        });
        filterAndDisplayAvailableCards(currentFilter);
        updateSaveButtonState();
    }

    function isCardSuitableForSlot(cardIdString, slotPositionOnField) {
        // Для проверки пригодности используем данные из allUserCards, где хранится "родная" позиция
        const cardMasterData = allUserCards.find(c => c.user_card_id.toString() === cardIdString);
        if (!cardMasterData || !cardMasterData.position) {
            console.warn(`isCardSuitableForSlot: Card master data or native position not found for ID ${cardIdString}`);
            return false;
        }

        const nativeCardPosition = cardMasterData.position; // "Родная" позиция (Forward, Defenseman, Goaltender)
        let slotRole = '';
        if (['LW', 'C', 'RW'].includes(slotPositionOnField)) slotRole = 'Forward';
        else if (['LD', 'RD'].includes(slotPositionOnField)) slotRole = 'Defenseman';
        else if (slotPositionOnField === 'G') slotRole = 'Goaltender';
        return nativeCardPosition === slotRole;
    }

    async function loadUserCards() {
        try {
            const response = await fetch('/api/cards/my-cards', { headers: { 'Authorization': `Bearer ${token}` }});
            if (!response.ok) throw new Error(`Не удалось загрузить карты (${response.status})`);
            allUserCards = await response.json();
             if (!Array.isArray(allUserCards)) {
                console.error("loadUserCards: данные не являются массивом:", allUserCards);
                allUserCards = [];
            }
        } catch (error) {
            console.error("Ошибка загрузки карт пользователя:", error);
            if(availableCardsContainer) availableCardsContainer.innerHTML = `<p>Ошибка загрузки карт: ${error.message}</p>`;
            allUserCards = [];
        }
    }

    async function loadTeamRoster() {
        try {
            const response = await fetch('/api/team/roster', { headers: { 'Authorization': `Bearer ${token}` }});
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({message: `Ошибка сервера: ${response.statusText}`}));
                 throw new Error(errorData.message || `Статус: ${response.status}`);
            }
            const dataFromServer = await response.json();
            currentRosterMap = dataFromServer.roster || {}; 
            
            ['LW', 'C', 'RW', 'LD', 'RD', 'G'].forEach(pos => {
                if (!currentRosterMap[pos]) {
                    currentRosterMap[pos] = null;
                }
            });
            
            updateChemistryDisplay(dataFromServer.team_chemistry_points);
            initialRosterStateForSave = getCurrentRosterForSave();
        } catch (error) {
            console.error("Ошибка загрузки состава команды:", error);
            updateTeamFormMessage(`Ошибка загрузки состава: ${error.message}`, 'error');
            currentRosterMap = {};
            ['LW', 'C', 'RW', 'LD', 'RD', 'G'].forEach(pos => currentRosterMap[pos] = null);
            updateChemistryDisplay(0);
            initialRosterStateForSave = getCurrentRosterForSave();
        }
    }

    function createSmallCardElement(card, isInRosterSlot = false) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('player-card-item-small');
        if (!card || typeof card.user_card_id === 'undefined') {
            console.error("createSmallCardElement: получены невалидные данные карты", card);
            cardDiv.textContent = "Ошибка карты";
            cardDiv.setAttribute('draggable', 'false'); 
            return cardDiv;
        }
        cardDiv.dataset.usercardid = card.user_card_id.toString();

        // Используем "родную" позицию карты для классов и отображения.
        // Для карт в ростере, она должна быть в card.card_actual_position.
        // Для карт из allUserCards, она в card.position.
        const displayPosition = isInRosterSlot ? card.card_actual_position : card.position;

        if (displayPosition && typeof displayPosition === 'string') {
            cardDiv.classList.add(`position-${displayPosition.toLowerCase().replace(/\s+/g, '-')}`);
        } else {
            // console.warn("Card missing or invalid displayPosition for class:", card, "DisplayPosition:", displayPosition);
        }
        
        let displayTier = 'bronze';
        const ovr = typeof card.base_ovr === 'number' ? card.base_ovr : 0;
        // Для тира используем card.tier, если есть, иначе рассчитываем
        const tierSource = card.tier || ''; // Защита от undefined
        if (tierSource && typeof tierSource === 'string') {
            displayTier = tierSource.toLowerCase();
        } else {
            if (ovr >= 95) displayTier = 'legendary';
            else if (ovr >= 90) displayTier = 'epic';
            else if (ovr >= 75) displayTier = 'gold';
            else if (ovr >= 55) displayTier = 'silver';
        }
        cardDiv.classList.add(`tier-${displayTier}`);

        cardDiv.innerHTML = `
            <img src="images/cards/${card.image_url || 'placeholder.png'}" alt="${card.player_name || 'Player'}" onerror="this.src='images/cards/placeholder.png';">
            <span class="player-name-small">${card.player_name || 'N/A'} (OVR: ${ovr || '--'})</span>
            <span class="player-stats-small">A:${card.base_attack || 0} D:${card.base_defense || 0}</span>
            <small style="font-size:0.7em; color:#999;">(${(displayPosition || 'N/A')})</small>
        `;
        
        const dragOriginalPos = isInRosterSlot ? (card.current_slot_position_for_drag || null) : null;
        makeCardDraggable(cardDiv, isInRosterSlot ? 'roster' : 'available', dragOriginalPos);
        return cardDiv;
    }
        
    let currentFilter = 'All';
    function filterAndDisplayAvailableCards(filterType = 'All') {
        currentFilter = filterType;
        if (cardFilterPositionSpan) cardFilterPositionSpan.textContent = currentFilter;
        if (!availableCardsContainer) return;
        
        availableCardsContainer.innerHTML = '';

        const assignedCardIdsInRoster = new Set(
            Object.values(currentRosterMap)
                  .filter(cardData => cardData && cardData.user_card_id)
                  .map(cardData => cardData.user_card_id.toString())
        );
        
        if (!allUserCards || allUserCards.length === 0) {
             availableCardsContainer.innerHTML = '<p>Нет доступных карт.</p>';
             return;
        }
        
        const filteredCardsToDisplay = allUserCards.filter(card => {
            if (!card || typeof card.position !== 'string') return false;
            return (currentFilter === 'All' || card.position === currentFilter);
        });

        if (filteredCardsToDisplay.length === 0) {
            availableCardsContainer.innerHTML = `<p>Нет карт, соответствующих фильтру${currentFilter !== 'All' ? ` '${currentFilter}'` : ''}.</p>`;
            return;
        }

        filteredCardsToDisplay.forEach(card => {
            if (!card || typeof card.user_card_id === 'undefined') return;
            const cardElement = createSmallCardElement(card, false); // isInRosterSlot = false
            
            if (assignedCardIdsInRoster.has(card.user_card_id.toString())) {
                cardElement.classList.add('assigned');
                cardElement.setAttribute('draggable', 'false');
            } else {
                cardElement.classList.remove('assigned');
                // draggable="true" будет установлен в makeCardDraggable, если source 'available' и нет .assigned
                // Перевызов makeCardDraggable здесь, чтобы обновить состояние draggable
                makeCardDraggable(cardElement, 'available', null);
            }
            availableCardsContainer.appendChild(cardElement);
        });
    }

    function updateSaveButtonState() {
        if (!saveTeamButton) return;
        const currentRosterForSave = getCurrentRosterForSave();
        const hasChanges = JSON.stringify(currentRosterForSave) !== JSON.stringify(initialRosterStateForSave);
        saveTeamButton.disabled = !hasChanges;
        if (hasChanges) {
            if (teamFormMessage && !teamFormMessage.classList.contains('error') && !teamFormMessage.classList.contains('success')) {
                updateTeamFormMessage('Есть несохраненные изменения.', 'info');
            }
        } else {
            if (teamFormMessage && teamFormMessage.classList.contains('info')) {
                updateTeamFormMessage('');
            }
        }
    }

    function getCurrentRosterForSave() {
        const rosterToSave = {};
        for (const position in currentRosterMap) {
            const cardData = currentRosterMap[position];
            rosterToSave[position] = (cardData && typeof cardData.user_card_id !== 'undefined') ? cardData.user_card_id : null;
        }
        return rosterToSave;
    }

    async function saveTeam() {
        if (!saveTeamButton || saveTeamButton.disabled) return;
        const rosterToSave = getCurrentRosterForSave();
        
        console.log("Attempting to save roster:", rosterToSave);

        const uniqueCardIdsInRoster = new Set();
        let hasDuplicates = false;
        let duplicateCardId = null;
        for (const pos in rosterToSave) {
            const cardId = rosterToSave[pos];
            if (cardId !== null) {
                if (uniqueCardIdsInRoster.has(cardId)) {
                    hasDuplicates = true;
                    duplicateCardId = cardId;
                    break;
                }
                uniqueCardIdsInRoster.add(cardId);
            }
        }
        if (hasDuplicates) {
            updateTeamFormMessage(`Ошибка: Карта с ID ${duplicateCardId} не может быть на нескольких позициях.`, 'error');
            updateSaveButtonState();
            return;
        }

        updateTeamFormMessage('Сохранение...', 'info');
        saveTeamButton.disabled = true;

        try {
            const response = await fetch('/api/team/roster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ roster: rosterToSave }) 
            });
            
            console.log("Save response status:", response.status);
            
            const data = await response.json();
            console.log("Save response data:", data);
            
            if (response.ok) {
                updateTeamFormMessage(data.message || 'Команда сохранена!', 'success');
                initialRosterStateForSave = { ...rosterToSave }; 
                if (typeof data.team_chemistry_points !== 'undefined') {
                    updateChemistryDisplay(data.team_chemistry_points); 
                }
            } else {
                updateTeamFormMessage(`Ошибка: ${data.message || 'Не удалось сохранить'}`, 'error');
            }
        } catch (error) {
            console.error("Ошибка сохранения команды:", error);
            updateTeamFormMessage(`Сетевая ошибка: ${error.message}`, 'error');
        } finally {
            updateSaveButtonState();
        }
    }
    
    function updateChemistryDisplay(points) {
        const currentPoints = parseInt(points, 10) || 0;
        if (teamChemistryPointsEl) {
            teamChemistryPointsEl.textContent = currentPoints;
        }
        if (chemistryBonusMsgEl) {
            chemistryBonusMsgEl.style.display = (currentPoints === 6) ? 'inline' : 'none';
        }
    }
    
    function updateTeamFormMessage(message, type = 'info') {
        if (!teamFormMessage) return;
        teamFormMessage.textContent = message;
        teamFormMessage.className = 'form-message';
        if (type) teamFormMessage.classList.add(type);
    }

    if (saveTeamButton) saveTeamButton.addEventListener('click', saveTeam);

    cardFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            cardFilterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterAndDisplayAvailableCards(button.dataset.filter);
        });
    });

    async function initializePage() {
        await loadUserCards();
        await loadTeamRoster();
        rerenderAllBasedOnState();
    }

    initializePage();
});