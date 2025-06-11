// public/prepare-match.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const availableBiCardsList = document.getElementById('availableBiCardsList');
    const biSlots = document.querySelectorAll('.bi-slot');
    const startMatchButton = document.getElementById('startMatchButton');
    const prepareMatchMessage = document.getElementById('prepareMatchMessage');

    let allUserBiCards = []; // { template_id, name, quantity, ... }
    let selectedBiCardsInSlots = [null, null, null]; // Массив для хранения ID выбранных БИ карт или объектов карт

    let draggedBiCardItem = null; // { template_id, element, source ('available' или 'slot'), originalSlotIndex }

    function makeBiCardDraggable(cardElement, cardData, source, slotIndex = null) {
        cardElement.setAttribute('draggable', 'true');
        cardElement.dataset.templateId = cardData.template_id; // Используем template_id для идентификации типа карты

        cardElement.removeEventListener('dragstart', onDragStartBiCard);
        cardElement.removeEventListener('dragend', onDragEndBiCard);
        cardElement.addEventListener('dragstart', onDragStartBiCard);
        cardElement.addEventListener('dragend', onDragEndBiCard);
        
        cardElement.dataset.dragSource = source;
        cardElement.dataset.dragOriginalSlotIndex = slotIndex !== null ? slotIndex : '';
    }

    function onDragStartBiCard(e) {
        const cardElement = e.currentTarget;
        if (cardElement.dataset.dragSource === 'available' && cardElement.classList.contains('assigned')) {
            e.preventDefault(); return;
        }
        draggedBiCardItem = {
            template_id: cardElement.dataset.templateId,
            element: cardElement,
            source: cardElement.dataset.dragSource,
            originalSlotIndex: cardElement.dataset.dragOriginalSlotIndex !== '' ? parseInt(cardElement.dataset.dragOriginalSlotIndex) : null
        };
        e.dataTransfer.setData('text/plain', draggedBiCardItem.template_id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => cardElement.classList.add('dragging'), 0); // dragging класс из my-team.css
    }

    function onDragEndBiCard(e) {
        if (e.currentTarget) e.currentTarget.classList.remove('dragging');
        // draggedBiCardItem сбрасывается в drop обработчиках
    }
    
    biSlots.forEach(slot => {
        slot.addEventListener('dragover', e => {
            e.preventDefault();
            if (draggedBiCardItem) {
                e.dataTransfer.dropEffect = 'move';
                slot.classList.add('drag-over');
            }
        });
        slot.addEventListener('dragleave', e => slot.classList.remove('drag-over'));
        slot.addEventListener('drop', handleDropOnBiSlot);
    });

    // Зона для возврата карт из слотов в общий список
    if (availableBiCardsList) {
        availableBiCardsList.addEventListener('dragover', e => {
            e.preventDefault();
            if (draggedBiCardItem && draggedBiCardItem.source === 'slot') {
                 e.dataTransfer.dropEffect = 'move';
                 availableBiCardsList.classList.add('drag-over-available'); // Нужен стиль для этого
            } else {
                 e.dataTransfer.dropEffect = 'none';
            }
        });
        availableBiCardsList.addEventListener('dragleave', e => availableBiCardsList.classList.remove('drag-over-available'));
        availableBiCardsList.addEventListener('drop', handleDropOnAvailableBiList);
    }


    function handleDropOnBiSlot(event) {
        event.preventDefault();
        const targetSlotElement = event.currentTarget;
        targetSlotElement.classList.remove('drag-over');
        if (!draggedBiCardItem) { draggedBiCardItem = null; return; }

        const targetSlotIndex = parseInt(targetSlotElement.dataset.slotIndex);
        const droppedCardTemplateId = draggedBiCardItem.template_id;
        const droppedCardData = allUserBiCards.find(c => c.template_id.toString() === droppedCardTemplateId);

        if (!droppedCardData) {
            console.error("Drop_BiSlot: Данные карты не найдены:", droppedCardTemplateId);
            draggedBiCardItem = null; return;
        }
        
        // Логика похожа на My Team:
        // 1. Карта, которая была в ЦЕЛЕВОМ слоте
        const cardPreviouslyInTargetSlotData = selectedBiCardsInSlots[targetSlotIndex];
        // 2. Слот, откуда тащили (ЕСЛИ из другого слота)
        const sourceSlotIndex = draggedBiCardItem.source === 'slot' ? draggedBiCardItem.originalSlotIndex : null;

        // Очищаем исходный слот, если тащили из другого слота
        if (sourceSlotIndex !== null && sourceSlotIndex !== targetSlotIndex) {
            selectedBiCardsInSlots[sourceSlotIndex] = null;
        }

        // Помещаем новую карту в целевой слот
        selectedBiCardsInSlots[targetSlotIndex] = droppedCardData;

        // Если в целевом слоте была карта и это был "свап" из другого слота
        if (cardPreviouslyInTargetSlotData && 
            cardPreviouslyInTargetSlotData.template_id.toString() !== droppedCardTemplateId && 
            sourceSlotIndex !== null && 
            sourceSlotIndex !== targetSlotIndex) {
            selectedBiCardsInSlots[sourceSlotIndex] = cardPreviouslyInTargetSlotData;
        }
        
        renderBiSlotsAndAvailable();
        draggedBiCardItem = null;
    }
    
    function handleDropOnAvailableBiList(event) {
        event.preventDefault();
        availableBiCardsList.classList.remove('drag-over-available');
        if (!draggedBiCardItem || draggedBiCardItem.source !== 'slot') {
            draggedBiCardItem = null; return;
        }
        const originalSlotIndex = draggedBiCardItem.originalSlotIndex;
        if (originalSlotIndex !== null && selectedBiCardsInSlots[originalSlotIndex] && selectedBiCardsInSlots[originalSlotIndex].template_id.toString() === draggedBiCardItem.template_id) {
            selectedBiCardsInSlots[originalSlotIndex] = null;
        }
        renderBiSlotsAndAvailable();
        draggedBiCardItem = null;
    }

    function renderBiSlotsAndAvailable() {
        // Обновляем слоты
        biSlots.forEach((slotElement, index) => {
            slotElement.innerHTML = ''; // Очищаем
            const cardData = selectedBiCardsInSlots[index];
            if (cardData) {
                const cardDiv = createBiCardElementForDisplay(cardData, true, index); // true - в слоте
                slotElement.appendChild(cardDiv);
            } else {
                slotElement.textContent = 'Перетащите БИ карту';
            }
        });

        // Обновляем список доступных карт
        displayAvailableBiCards();
    }


    async function loadAvailableBiCards() {
        try {
            const response = await fetch('/api/inventory/my-big-impact-cards', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Не удалось загрузить БИ карты');
            allUserBiCards = await response.json();
            renderBiSlotsAndAvailable(); // Первичная отрисовка
        } catch (error) {
            console.error("Ошибка загрузки БИ карт:", error);
            if (availableBiCardsList) availableBiCardsList.innerHTML = `<p>Ошибка: ${error.message}</p>`;
        }
    }

    function displayAvailableBiCards() {
        if (!availableBiCardsList) return;
        availableBiCardsList.innerHTML = '';

        const assignedTemplateIds = new Set(
            selectedBiCardsInSlots.filter(Boolean).map(card => card.template_id.toString())
        );

        if (allUserBiCards.length === 0) {
            availableBiCardsList.innerHTML = '<p>У вас нет Big Impact карт.</p>';
            return;
        }

        allUserBiCards.forEach(card => {
            const remainingQuantity = card.quantity - Array.from(assignedTemplateIds).filter(id => id === card.template_id.toString()).length;
            
            if (remainingQuantity > 0) { // Показываем карту, только если ее еще можно выбрать
                const cardDiv = createBiCardElementForDisplay(card, false); // false - в списке доступных
                 // Если этот тип карты уже выбран столько раз, сколько есть в quantity, делаем ее .assigned
                if (assignedTemplateIds.has(card.template_id.toString())) {
                    let countInSlots = 0;
                    selectedBiCardsInSlots.forEach(slotCard => {
                        if (slotCard && slotCard.template_id === card.template_id) {
                            countInSlots++;
                        }
                    });
                    if (countInSlots >= card.quantity) {
                         cardDiv.classList.add('assigned');
                         cardDiv.setAttribute('draggable', 'false');
                    }
                }
                availableBiCardsList.appendChild(cardDiv);
            }
        });
         if (availableBiCardsList.children.length === 0 && allUserBiCards.length > 0) {
            availableBiCardsList.innerHTML = '<p>Все доступные карты уже выбраны.</p>';
        }
    }

    function createBiCardElementForDisplay(cardData, isInSlot, slotIndexIfInSlot = null) {
        const div = document.createElement('div');
        // Используем классы, похожие на my-team.js для консистентности, если это применимо
        div.classList.add(isInSlot ? 'bi-card-in-slot' : 'available-bi-card-item');
        // div.dataset.templateId = cardData.template_id; // Уже в makeBiCardDraggable

        div.innerHTML = `
            <img src="images/bi_cards/${cardData.image_url || 'bi_placeholder.png'}" alt="${cardData.name}" onerror="this.src='images/bi_cards/bi_placeholder.png';">
            <p class="bi-name"><strong>${cardData.name}</strong></p>
            <p class="bi-type">${cardData.card_type}</p>
            ${!isInSlot ? `<p class="bi-quantity">Кол-во: ${cardData.quantity}</p>` : ''}
        `;
        if (isInSlot) {
            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remove-bi-from-slot');
            removeBtn.innerHTML = '×';
            removeBtn.title = "Убрать карту";
            removeBtn.onclick = (e) => {
                e.stopPropagation(); // Предотвратить drag, если он есть на родителе
                if (slotIndexIfInSlot !== null) {
                    selectedBiCardsInSlots[slotIndexIfInSlot] = null;
                    renderBiSlotsAndAvailable();
                }
            };
            div.appendChild(removeBtn);
        }
        
        makeBiCardDraggable(div, cardData, isInSlot ? 'slot' : 'available', slotIndexIfInSlot);
        return div;
    }

    if (startMatchButton) {
        startMatchButton.addEventListener('click', () => {
            const chosenCards = selectedBiCardsInSlots.filter(Boolean); // Убираем null
            if (chosenCards.length === 0) {
                updatePrepareMatchMessage("Выберите хотя бы одну Big Impact карту или начните без них.", "info");
                // return; // Можно разрешить начинать без БИ карт
            }
            console.log("Начать матч с выбранными БИ картами:", chosenCards);
            updatePrepareMatchMessage(`Матч начинается с ${chosenCards.length} БИ картами! (пока заглушка)`, "success");
            // Здесь будет логика перехода к симуляции матча
        });
    }

    function updatePrepareMatchMessage(message, type = 'info') {
        if (!prepareMatchMessage) return;
        prepareMatchMessage.textContent = message;
        prepareMatchMessage.className = 'form-message';
        if (type) prepareMatchMessage.classList.add(type);
    }
    
    // Добавить кнопку "Начать матч" или ссылку на эту страницу с dashboard.html
    // Например, по клику на кнопку "Играть" на дашборде: window.location.href = 'prepare-match.html';

    loadAvailableBiCards();
});