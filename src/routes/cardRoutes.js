// src/routes/cardRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Ваш модуль для работы с БД (PostgreSQL)
const authMiddleware = require('../middleware/authMiddleware');

// Вспомогательная функция для случайного выбора N элементов из массива
function getRandomElements(arr, n) {
    if (!arr || arr.length === 0 || n <= 0) return [];
    if (n >= arr.length) return [...arr]; // Возвращаем копию, если нужно больше или столько же, сколько есть

    const result = new Array(n);
    let len = arr.length;
    const taken = new Array(len);
    if (n > len) throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        const x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}


// POST /api/cards/starter-pack - Получить стартовый набор карт
router.post('/starter-pack', authMiddleware, async (req, res) => {
    const userId = req.user.userId;

    try {
        // 1. Проверить, получал ли пользователь уже стартовый набор
        const existingCardsResult = await db.query('SELECT COUNT(*) FROM user_cards WHERE user_id = $1', [userId]);
        if (parseInt(existingCardsResult.rows[0].count) > 0) {
            return res.status(400).json({ message: 'Стартовый набор уже получен или у вас уже есть карты.' });
        }

        // 2. Определяем требования к набору
        const requiredPositions = {
            'Goaltender': 1,
            'Defenseman': 2,
            'Forward': 3
        };
        const totalRequiredCards = Object.values(requiredPositions).reduce((sum, count) => sum + count, 0); // 6 карт

        let selectedTemplateIds = [];
        const client = await db.connect(); // Используем клиента для нескольких запросов

        try {
            for (const position in requiredPositions) {
                const countNeeded = requiredPositions[position];
                
                // Получаем все ID карт-шаблонов для данной позиции
                // Можно добавить условие на редкость, если нужно, но для случайной редкости из шаблона это не требуется
                const availableCardsForPositionResult = await client.query(
                    'SELECT id FROM cards WHERE position = $1', 
                    [position]
                );
                
                const availableCardsForPosition = availableCardsForPositionResult.rows;

                if (availableCardsForPosition.length < countNeeded) {
                    // Недостаточно карт данной позиции в базе. Это проблема конфигурации БД.
                    // Можно либо выдать ошибку, либо попытаться дополнить другими картами (усложняет).
                    // Для начала - ошибка.
                    throw new Error(`Недостаточно карт на позиции '${position}' в базе данных для формирования стартового набора.`);
                }

                // Выбираем случайные ID карт для этой позиции
                const chosenCardsForPosition = getRandomElements(availableCardsForPosition, countNeeded);
                selectedTemplateIds.push(...chosenCardsForPosition.map(card => card.id));
            }

            // Логика шанса на эпическую карту (если редкость не из шаблона, а определяется здесь)
            // Если редкость уже в шаблоне, то предыдущий шаг уже выбрал карты с их "родной" редкостью.
            // Этот блок кода ниже для случая, если бы мы хотели *назначить* редкость здесь.
            // Если редкость уже в шаблонах, то этот блок не нужен, и мы просто берем выбранные selectedTemplateIds.
            // ПРЕДПОЛОЖИМ, ЧТО РЕДКОСТЬ УЖЕ В ШАБЛОНЕ. Поэтому этот блок мы сейчас пропустим.
            // Если бы нужно было назначать редкость:
            /*
            let finalSelectedTemplateIdsWithRarity = [];
            for (const templateId of selectedTemplateIds) {
                let rarity = 'Common'; // По умолчанию
                if (Math.random() < 0.05) { // 5% шанс на Epic
                    rarity = 'Epic';
                } else if (Math.random() < 0.25) { // 25% шанс на Rare (после проверки на Epic)
                    rarity = 'Rare';
                }
                // Тут нужно было бы либо найти шаблон карты с такой редкостью, либо модифицировать карту.
                // Это усложняет, если шаблоны уже имеют редкость.
                // Проще выбирать из пула карт, уже имеющих разную редкость.
                // Сейчас мы предполагаем, что selectedTemplateIds уже содержат карты с их родной редкостью.
            }
            */
            
            if (selectedTemplateIds.length !== totalRequiredCards) {
                // Это не должно произойти, если предыдущие шаги отработали корректно
                throw new Error('Ошибка при формировании набора: количество выбранных карт не соответствует требуемому.');
            }

            // 3. Добавить выбранные карты пользователю в user_cards
            const insertPromises = selectedTemplateIds.map(cardTemplateId => {
                return client.query( // Используем того же клиента
                    'INSERT INTO user_cards (user_id, card_template_id) VALUES ($1, $2) RETURNING id, card_template_id', // Возвращаем ID для информации
                    [userId, cardTemplateId]
                );
            });

            const newUserCardsResults = await Promise.all(insertPromises);
            // Для ответа можно запросить полные данные созданных карт, если нужно
            // Но для простоты пока вернем только результат операции
            const createdUserCardIds = newUserCardsResults.map(result => result.rows[0].id);


            // Теперь получим полные данные для ответа клиенту
            const detailedNewCardsQuery = `
                SELECT
                    uc.id AS user_card_id, uc.current_level, uc.experience_points, uc.acquired_at,
                    ct.id AS card_template_id, ct.player_name, ct.image_url, ct.position,
                    ct.rarity, ct.base_attack, ct.base_defense, ct.base_speed, ct.base_stamina, ct.description
                FROM user_cards uc
                JOIN cards ct ON uc.card_template_id = ct.id
                WHERE uc.id = ANY($1::int[])`;

            const detailedNewCardsResult = await client.query(detailedNewCardsQuery, [createdUserCardIds]);


            res.status(201).json({
                message: `Стартовый набор из ${totalRequiredCards} карт успешно получен!`,
                cards: detailedNewCardsResult.rows // Отправляем полные данные новых карт
            });

        } catch (error) {
            // Если ошибка произошла внутри этого try, она будет поймана здесь
            console.error('Ошибка при формировании или добавлении стартового набора:', error);
            // Отправляем специфичное сообщение об ошибке, если оно было установлено
            res.status(500).json({ message: error.message || 'Ошибка сервера при выдаче стартового набора' });
        } finally {
            client.release(); // ОБЯЗАТЕЛЬНО освобождаем клиента
        }

    } catch (error) {
        // Если ошибка при подключении к БД или до внутреннего try
        console.error('Общая ошибка при выдаче стартового набора:', error);
        res.status(500).json({ message: 'Ошибка сервера при выдаче стартового набора' });
    }
});


// GET /api/cards/my-cards - Получить все карты пользователя (без изменений)
router.get('/my-cards', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    try {
        // 1. Получаем основные данные карт пользователя и их шаблонов
        const queryText = `
            SELECT
                uc.id AS user_card_id, uc.current_level, uc.experience_points, uc.acquired_at,  uc.games_remaining, uc.renewals_left,
                ct.id AS card_template_id, ct.player_name, ct.image_url, ct.position,
                ct.rarity, 
                ct.base_attack, ct.base_defense, ct.base_speed, ct.base_stamina, 
                ct.base_ovr, ct.tier, 
                ct.description,
                ct.base_skating, ct.base_shooting, ct.base_passing, 
                ct.base_defense_skill, ct.base_physical,
                ct.base_reflexes, ct.base_puck_control, ct.base_positioning
            FROM user_cards uc
            JOIN cards ct ON uc.card_template_id = ct.id
            WHERE uc.user_id = $1
            ORDER BY ct.tier, ct.base_ovr DESC, ct.player_name;
        `;
        const userCardsResult = await db.query(queryText, [userId]);
        const userCards = userCardsResult.rows;

        if (userCards.length === 0) {
            return res.status(200).json([]);
        }

        // 2. Для каждой карты получаем ее примененные скиллы
        const cardsWithSkills = [];
        for (const card of userCards) {
            const appliedSkillsResult = await db.query(
                `SELECT 
                    ucas.skill_template_id, 
                    pst.name AS skill_name, 
                    ucas.boost_points_added
                 FROM user_card_applied_skills ucas
                 JOIN player_skill_templates pst ON ucas.skill_template_id = pst.id
                 WHERE ucas.user_card_id = $1`,
                [card.user_card_id]
            );
            cardsWithSkills.push({
                ...card,
                applied_skills: appliedSkillsResult.rows || [] // Добавляем массив скиллов к объекту карты
            });
        }
        
        res.status(200).json(cardsWithSkills);

    } catch (error) {
        console.error('Ошибка при получении карт пользователя (с детализацией скиллов):', error);
        res.status(500).json({ message: 'Ошибка сервера при получении карт пользователя' });
    }
});

// GET /api/cards/starter-pack-status - Проверить, может ли пользователь получить стартовый набор (без изменений)
router.get('/starter-pack-status', authMiddleware, async (req, res) => {
    // ... (ваш существующий код)
    const userId = req.user.userId;
    try {
        const existingCardsResult = await db.query('SELECT COUNT(*) FROM user_cards WHERE user_id = $1', [userId]);
        const canReceiveStarterPack = parseInt(existingCardsResult.rows[0].count) === 0;
        res.status(200).json({ canReceiveStarterPack });
    } catch (error) {
        console.error('Ошибка при проверке статуса стартового набора:', error);
        res.status(500).json({ message: 'Ошибка сервера при проверке статуса стартового набора' });
    }
});

module.exports = router;