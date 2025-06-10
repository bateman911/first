// src/routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const TEAM_NAME_CHANGE_COST_COINS = 100;
const FREE_TEAM_NAME_CHANGES_LIMIT = 1;

// Вспомогательная функция для определения роли по полевой позиции (для сыгранности)
function getRoleForFieldPosition(fieldPosition) {
    if (['LW', 'C', 'RW'].includes(fieldPosition)) return 'Forward';
    if (['LD', 'RD'].includes(fieldPosition)) return 'Defenseman';
    if (fieldPosition === 'G') return 'Goaltender';
    return null;
}

// GET /api/team/roster - Получить текущий состав команды И СЫГРАННОСТЬ
router.get('/roster', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    console.log(`[UserID: ${userId}] GET /api/team/roster - Запрос на получение ростера и сыгранности.`);
    try {
        const rosterResult = await pool.query(
            `SELECT
                tr.field_position,
                uc.id AS user_card_id,
                ct.id AS card_template_id,
                ct.player_name,
                ct.image_url,
                ct.position AS card_actual_position, 
                ct.rarity,
                ct.base_attack, 
                ct.base_defense,
                ct.base_speed,
                ct.base_stamina,
                ct.base_ovr,      -- Добавлено для OVR
                ct.tier,          -- Добавлено для Tier
                uc.current_level
            FROM team_rosters tr
            JOIN user_cards uc ON tr.user_card_id = uc.id
            JOIN cards ct ON uc.card_template_id = ct.id
            WHERE tr.user_id = $1`,
            [userId]
        );
        console.log(`[UserID: ${userId}] GET /api/team/roster - Найдено записей в team_rosters из БД: ${rosterResult.rowCount}`);

        const rosterMap = {};
        rosterResult.rows.forEach(row => {
            rosterMap[row.field_position] = row;
        });

        const userChemistryResult = await pool.query(
            'SELECT team_chemistry_points FROM users WHERE id = $1',
            [userId]
        );
        const chemistryPoints = userChemistryResult.rows.length > 0 ? (userChemistryResult.rows[0].team_chemistry_points || 0) : 0;
        console.log(`[UserID: ${userId}] GET /api/team/roster - Сыгранность из БД users: ${chemistryPoints}`);

        res.json({
            roster: rosterMap,
            team_chemistry_points: chemistryPoints // Отправляем и сыгранность
        });

    } catch (error) {
        console.error(`[UserID: ${userId}] GET /api/team/roster - Ошибка получения состава команды:`, error);
        res.status(500).json({ message: "Ошибка сервера при получении состава" });
    }
});

// POST /api/team/roster - Обновить/сохранить состав команды И СЫГРАННОСТЬ
router.post('/roster', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { roster } = req.body; 
    console.log(`[UserID: ${userId}] POST /api/team/roster - Попытка сохранить ростер:`, roster);

    if (!roster || typeof roster !== 'object') {
        return res.status(400).json({ message: "Некорректные данные состава" });
    }

    const allowedPositions = { 'LW': 1, 'C': 1, 'RW': 1, 'LD': 1, 'RD': 1, 'G': 1 };
    // Валидация позиций (у вас уже есть)

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log(`[UserID: ${userId}] POST /api/team/roster - Начало транзакции.`);

        const deleteResult = await client.query('DELETE FROM team_rosters WHERE user_id = $1', [userId]);
        console.log(`[UserID: ${userId}] POST /api/team/roster - Удалено старых записей из team_rosters: ${deleteResult.rowCount}`);

        const insertPromises = [];
        const assignedUserCardIds = new Set();
        let cardsInNewRosterForChemistry = [];

        for (const positionKey in roster) {
            if (!allowedPositions[positionKey]) { // Дополнительная проверка на всякий случай
                 console.warn(`[UserID: ${userId}] POST /api/team/roster - Обнаружена недопустимая позиция '${positionKey}' во входных данных.`);
                 continue; // Пропускаем недопустимые позиции
            }
            const userCardIdInput = roster[positionKey];
            const userCardId = (userCardIdInput !== null && typeof userCardIdInput !== 'undefined') ? parseInt(userCardIdInput, 10) : null;

            if (userCardId) {
                if (isNaN(userCardId)) {
                    throw new Error(`Некорректный ID карты для позиции ${positionKey}. Ожидалось число, получено: ${userCardIdInput}`);
                }
                if (assignedUserCardIds.has(userCardId)) {
                    throw new Error(`Карта с ID ${userCardId} не может быть назначена на несколько позиций.`);
                }
                assignedUserCardIds.add(userCardId);

                const cardOwnerCheck = await client.query('SELECT id FROM user_cards WHERE id = $1 AND user_id = $2', [userCardId, userId]);
                if (cardOwnerCheck.rows.length === 0) {
                    throw new Error(`Карта с ID ${userCardId} не принадлежит пользователю ${userId} или не существует.`);
                }

                console.log(`[UserID: ${userId}] POST /api/team/roster - Добавление в team_rosters: Pos: ${positionKey}, CardID: ${userCardId}`);
                insertPromises.push(
                    client.query('INSERT INTO team_rosters (user_id, field_position, user_card_id) VALUES ($1, $2, $3)', [userId, positionKey, userCardId])
                );
                cardsInNewRosterForChemistry.push({ 
                    user_card_id: userCardId, 
                    field_position_role: getRoleForFieldPosition(positionKey) 
                });
            } else {
                console.log(`[UserID: ${userId}] POST /api/team/roster - Позиция ${positionKey} оставлена пустой.`);
            }
        }
        
        if (insertPromises.length > 0) {
            const insertResults = await Promise.all(insertPromises);
            insertResults.forEach((result, index) => {
                console.log(`[UserID: ${userId}] POST /api/team/roster - Вставка ${index + 1}: ${result.rowCount > 0 ? 'успешно' : 'неудачно или 0 строк'}`);
            });
        } else {
            console.log(`[UserID: ${userId}] POST /api/team/roster - Нет карт для вставки в новый ростер.`);
        }
        
        // Расчет и сохранение сыгранности
        let chemistryPoints = 0;
        if (cardsInNewRosterForChemistry.length > 0) {
            const cardIdsForQuery = cardsInNewRosterForChemistry.map(c => c.user_card_id);
            const cardPositionsResult = await client.query(
                `SELECT uc.id as user_card_id, c.position as native_card_position 
                 FROM user_cards uc 
                 JOIN cards c ON uc.card_template_id = c.id 
                 WHERE uc.id = ANY($1::int[])`,
                [cardIdsForQuery]
            );
            
            const nativePositionsMap = new Map();
            cardPositionsResult.rows.forEach(row => nativePositionsMap.set(row.user_card_id, row.native_card_position));

            cardsInNewRosterForChemistry.forEach(rosterEntry => {
                const nativePosition = nativePositionsMap.get(rosterEntry.user_card_id);
                if (nativePosition && rosterEntry.field_position_role && nativePosition === rosterEntry.field_position_role) {
                    chemistryPoints++;
                }
            });
        }
        
        const chemistryUpdateResult = await client.query('UPDATE users SET team_chemistry_points = $1 WHERE id = $2', [chemistryPoints, userId]);
        console.log(`[UserID: ${userId}] POST /api/team/roster - Обновлена сыгранность: ${chemistryPoints}. Затронуто строк в users: ${chemistryUpdateResult.rowCount}`);

        await client.query('COMMIT');
        console.log(`[UserID: ${userId}] POST /api/team/roster - Транзакция ЗАФИКСИРОВАНА (COMMIT).`);
        
        res.status(200).json({ 
            message: "Состав команды успешно обновлен",
            team_chemistry_points: chemistryPoints // Возвращаем для обновления на клиенте
        });

    } catch (error) {
        console.error(`[UserID: ${userId}] POST /api/team/roster - Ошибка при обновлении состава команды:`, error.message, error.stack);
        try {
            await client.query('ROLLBACK');
            console.log(`[UserID: ${userId}] POST /api/team/roster - Транзакция ОТКАЧЕНА (ROLLBACK).`);
        } catch (rollbackError) {
            console.error(`[UserID: ${userId}] POST /api/team/roster - КРИТИЧЕСКАЯ ОШИБКА при откате транзакции:`, rollbackError);
        }
        res.status(500).json({ message: error.message || "Ошибка сервера при обновлении состава" });
    } finally {
        client.release();
        console.log(`[UserID: ${userId}] POST /api/team/roster - Клиент БД освобожден.`);
    }
});

// POST /api/team/rename - Обновить имя команды
router.post('/rename', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { newName } = req.body;
    console.log(`[UserID: ${userId}] POST /api/team/rename - Попытка сменить имя на: '${newName}'`);

    if (!newName || typeof newName !== 'string' || newName.trim().length < 3 || newName.trim().length > 50) {
        return res.status(400).json({ message: "Некорректное новое имя команды (3-50 символов)." });
    }

    const trimmedNewName = newName.trim();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        console.log(`[UserID: ${userId}] POST /api/team/rename - Начало транзакции.`);

        const existingTeamNameResult = await client.query(
            'SELECT id FROM users WHERE LOWER(team_name) = LOWER($1) AND id != $2',
            [trimmedNewName, userId]
        );
        if (existingTeamNameResult.rows.length > 0) {
            await client.query('ROLLBACK');
            console.log(`[UserID: ${userId}] POST /api/team/rename - Имя '${trimmedNewName}' уже занято. Откат.`);
            return res.status(409).json({ message: "Это имя команды уже занято." });
        }

        const userResult = await client.query(
            'SELECT gold, team_name_changes_count, team_name FROM users WHERE id = $1 FOR UPDATE',
            [userId]
        );
        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.log(`[UserID: ${userId}] POST /api/team/rename - Пользователь не найден. Откат.`);
            return res.status(404).json({ message: "Пользователь не найден." });
        }
        const userData = userResult.rows[0];
        let currentGold = parseInt(userData.gold || 0, 10);
        let changesCount = parseInt(userData.team_name_changes_count || 0, 10);
        console.log(`[UserID: ${userId}] POST /api/team/rename - Текущие данные: gold=${currentGold}, changes_count=${changesCount}, current_team_name='${userData.team_name}'`);

        if (userData.team_name === trimmedNewName) {
            await client.query('COMMIT');
            console.log(`[UserID: ${userId}] POST /api/team/rename - Имя не изменилось. Коммит.`);
            return res.status(200).json({
                message: "Имя команды не изменилось.",
                newTeamName: trimmedNewName,
                gold: currentGold,
                updated_team_name_changes_count: changesCount
            });
        }

        let cost = 0;
        if (changesCount >= FREE_TEAM_NAME_CHANGES_LIMIT) {
            cost = TEAM_NAME_CHANGE_COST_COINS;
            if (currentGold < cost) {
                await client.query('ROLLBACK');
                console.log(`[UserID: ${userId}] POST /api/team/rename - Недостаточно золота (нужно ${cost}, есть ${currentGold}). Откат.`);
                return res.status(402).json({ message: `Недостаточно золота. Требуется ${cost} монет.` });
            }
            currentGold -= cost;
            
        } else {
            
        }

        const newChangesCount = changesCount + 1;
        const updateResult = await client.query(
            'UPDATE users SET team_name = $1, gold = $2, team_name_changes_count = $3 WHERE id = $4',
            [trimmedNewName, currentGold, newChangesCount, userId]
        );
        

        await client.query('COMMIT');
        
        res.status(200).json({
            message: "Имя команды успешно изменено!",
            newTeamName: trimmedNewName,
            gold: currentGold,
            updated_team_name_changes_count: newChangesCount
        });

    } catch (error) {
        
        try {
            await client.query('ROLLBACK');
            
        } catch (rollbackError) {
            
        }
        if (error.code === '23505') {
             return res.status(409).json({ message: 'Это имя команды уже занято (ошибка БД).' });
        }
        res.status(500).json({ message: error.message || "Ошибка сервера при смене имени команды." });
    } finally {
        client.release();
        
    }
});

module.exports = router;