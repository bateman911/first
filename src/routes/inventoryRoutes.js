// src/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Ваш пул PostgreSQL
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/inventory/my-big-impact-cards (ваш существующий код)
router.get('/my-big-impact-cards', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    try {
        const result = await pool.query(
            `SELECT 
                ubic.id as user_bi_card_id, 
                ubic.quantity, 
                bict.id as template_id, 
                bict.name, 
                bict.description, 
                bict.card_type, 
                bict.image_url,
                bict.effect_details 
             FROM user_big_impact_cards ubic
             JOIN big_impact_card_templates bict ON ubic.template_id = bict.id
             WHERE ubic.user_id = $1 AND ubic.quantity > 0
             ORDER BY bict.card_type, bict.name`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения БИ карт пользователя:", error);
        res.status(500).json({ message: "Ошибка сервера при получении БИ карт" });
    }
});

// GET /api/inventory/player-cards/:userCardId/skills - Получить примененные скиллы для карты
router.get('/player-cards/:userCardId/skills', authMiddleware, async (req, res) => {
    const userId = req.user.userId; // ID текущего пользователя
    const { userCardId } = req.params;  // ID карты игрока (из user_cards)

    if (isNaN(parseInt(userCardId))) {
        return res.status(400).json({ message: "Некорректный ID карты игрока." });
    }

    try {
        // 1. Проверка, что запрашиваемая карта принадлежит текущему пользователю
        const cardOwnerCheck = await pool.query(
            'SELECT id FROM user_cards WHERE id = $1 AND user_id = $2',
            [userCardId, userId]
        );
        if (cardOwnerCheck.rows.length === 0) {
            return res.status(404).json({ message: "Карта игрока не найдена или не принадлежит вам." });
        }

        // 2. Получение примененных скиллов
        const skillsResult = await pool.query(
            `SELECT 
                ucas.id AS applied_skill_id, 
                ucas.skill_template_id, 
                pst.name AS skill_name, 
                pst.description AS skill_description,
                pst.applicable_to_role,
                ucas.boost_points_added
             FROM user_card_applied_skills ucas
             JOIN player_skill_templates pst ON ucas.skill_template_id = pst.id
             WHERE ucas.user_card_id = $1
             ORDER BY pst.name`,
            [userCardId]
        );

        res.json(skillsResult.rows);

    } catch (error) {
        console.error(`Ошибка получения скиллов для карты ${userCardId}:`, error);
        res.status(500).json({ message: "Ошибка сервера при получении скиллов карты." });
    }
});

// GET /api/inventory/my-boosts - Получить инвентарь бустов пользователя
router.get('/my-boosts', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    try {
        const boostsResult = await pool.query(
            `SELECT 
                ubi.id AS user_boost_inventory_id, 
                ubi.quantity,
                bt.id AS boost_template_id, 
                bt.name AS boost_name, 
                bt.description AS boost_description, 
                bt.quality AS boost_quality, 
                bt.points_value AS boost_points_value,
                bt.target_skill_template_id,
                pst.name AS target_skill_name, -- Имя целевого скилла
                bt.image_url AS boost_image_url
             FROM user_boosts_inventory ubi
             JOIN boost_templates bt ON ubi.boost_template_id = bt.id
             LEFT JOIN player_skill_templates pst ON bt.target_skill_template_id = pst.id
             WHERE ubi.user_id = $1 AND ubi.quantity > 0
             ORDER BY bt.quality, bt.name`, // Пример сортировки
            [userId]
        );
        res.json(boostsResult.rows);
    } catch (error) {
        console.error("Ошибка получения инвентаря бустов пользователя:", error);
        res.status(500).json({ message: "Ошибка сервера при получении инвентаря бустов." });
    }
});

// POST /api/inventory/player-cards/:userCardId/apply-boost - Применить буст
router.post('/player-cards/:userCardId/apply-boost', authMiddleware, async (req, res) => {
    const currentUserId = req.user.userId;
    const userCardIdParam = req.params.userCardId;
    const { skill_template_id_to_boost, user_boost_inventory_id } = req.body;

    // 1. Валидация входных данных
    if (isNaN(parseInt(userCardIdParam)) || isNaN(parseInt(skill_template_id_to_boost)) || isNaN(parseInt(user_boost_inventory_id))) {
        return res.status(400).json({ message: "Некорректные ID (карта, скилл или буст)." });
    }
    const userCardId = parseInt(userCardIdParam);
    const targetSkillTemplateId = parseInt(skill_template_id_to_boost);
    const userBoostInventoryId = parseInt(user_boost_inventory_id);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log(`[UserID: ${currentUserId}] ApplyBoost: Начало транзакции для карты ${userCardId}`);

        // 2. Проверить, что user_card_id принадлежит currentUserId
        const cardOwnerCheck = await client.query(
            'SELECT uc.id, c.position AS card_native_position FROM user_cards uc JOIN cards c ON uc.card_template_id = c.id WHERE uc.id = $1 AND uc.user_id = $2',
            [userCardId, currentUserId]
        );
        if (cardOwnerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Карта игрока не найдена или не принадлежит вам." });
        }
        const cardNativePosition = cardOwnerCheck.rows[0].card_native_position; // "Forward", "Defenseman", "Goaltender"

        // 3. Проверить, что user_boost_inventory_id принадлежит currentUserId и quantity > 0
        const boostInventoryCheck = await client.query(
            'SELECT ubi.id, ubi.quantity, ubi.boost_template_id, bt.points_value, bt.target_skill_template_id AS boost_targets_skill_id, pst.applicable_to_role AS skill_applicable_to_role FROM user_boosts_inventory ubi JOIN boost_templates bt ON ubi.boost_template_id = bt.id JOIN player_skill_templates pst ON bt.target_skill_template_id = pst.id WHERE ubi.id = $1 AND ubi.user_id = $2',
            [userBoostInventoryId, currentUserId]
        );
        if (boostInventoryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Выбранный буст не найден в вашем инвентаре." });
        }
        const boostData = boostInventoryCheck.rows[0];
        if (boostData.quantity <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "Выбранных бустов нет в наличии." });
        }

        // 4. Проверка совместимости:
        //    а. Совпадает ли skill_template_id_to_boost (выбранный на фронте скилл для улучшения) 
        //       с boostData.boost_targets_skill_id (на что реально действует буст).
        if (targetSkillTemplateId !== boostData.boost_targets_skill_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "Этот буст не предназначен для улучшения выбранного скилла." });
        }
        
        //    б. Совместим ли pst.applicable_to_role (из player_skill_templates для этого скилла) 
        //       с "родной" позицией карты игрока (cardNativePosition).
        const skillRole = boostData.skill_applicable_to_role; // 'Field', 'Goaltender', 'All'
        let cardRole = '';
        if (cardNativePosition === 'Goaltender') cardRole = 'Goaltender';
        else if (['Forward', 'Defenseman'].includes(cardNativePosition)) cardRole = 'Field';

        if (skillRole !== 'All' && skillRole !== cardRole) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Этот скилл (${skillRole}) не может быть применен к игроку этой позиции (${cardNativePosition} -> ${cardRole}).` });
        }

        // 5. Найти или создать запись в user_card_applied_skills
        let appliedSkillResult = await client.query(
            'SELECT id, boost_points_added FROM user_card_applied_skills WHERE user_card_id = $1 AND skill_template_id = $2',
            [userCardId, targetSkillTemplateId]
        );
        
        let newBoostPoints;
        let appliedSkillId;

        if (appliedSkillResult.rows.length > 0) {
            // Скилл уже есть, обновляем очки
            const currentAppliedSkill = appliedSkillResult.rows[0];
            appliedSkillId = currentAppliedSkill.id;
            newBoostPoints = (currentAppliedSkill.boost_points_added || 0) + boostData.points_value;
            await client.query(
                'UPDATE user_card_applied_skills SET boost_points_added = $1, updated_at = NOW() WHERE id = $2',
                [newBoostPoints, appliedSkillId]
            );
            console.log(`[UserID: ${currentUserId}] ApplyBoost: Обновлен скилл ID ${appliedSkillId} для карты ${userCardId}, новые очки: ${newBoostPoints}`);
        } else {
            // Скилла нет, создаем новую запись. Проверяем лимит в 4 скилла.
            const existingSkillsCountResult = await client.query(
                'SELECT COUNT(*) as count FROM user_card_applied_skills WHERE user_card_id = $1',
                [userCardId]
            );
            const existingSkillsCount = parseInt(existingSkillsCountResult.rows[0].count, 10);

            if (existingSkillsCount >= 4) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: "У игрока уже максимальное количество (4) активных скиллов. Нельзя добавить новый." });
            }
            
            newBoostPoints = boostData.points_value;
            const insertSkillResult = await client.query(
                'INSERT INTO user_card_applied_skills (user_card_id, skill_template_id, boost_points_added) VALUES ($1, $2, $3) RETURNING id',
                [userCardId, targetSkillTemplateId, newBoostPoints]
            );
            appliedSkillId = insertSkillResult.rows[0].id;
            console.log(`[UserID: ${currentUserId}] ApplyBoost: Добавлен новый скилл ID ${appliedSkillId} для карты ${userCardId}, очки: ${newBoostPoints}`);
        }

        // 6. Уменьшить quantity в user_boosts_inventory
        const newBoostQuantity = boostData.quantity - 1;
        if (newBoostQuantity > 0) {
            await client.query(
                'UPDATE user_boosts_inventory SET quantity = $1 WHERE id = $2',
                [newBoostQuantity, userBoostInventoryId]
            );
        } else {
            await client.query('DELETE FROM user_boosts_inventory WHERE id = $1', [userBoostInventoryId]);
        }
        console.log(`[UserID: ${currentUserId}] ApplyBoost: Использован буст инв. ID ${userBoostInventoryId}. Новое кол-во: ${newBoostQuantity}`);

        await client.query('COMMIT');
        console.log(`[UserID: ${currentUserId}] ApplyBoost: Транзакция ЗАФИКСИРОВАНА для карты ${userCardId}.`);
        
        // Возвращаем информацию об обновленном скилле и оставшемся количестве буста
        res.status(200).json({ 
            message: "Буст успешно применен!",
            updatedSkill: {
                applied_skill_id: appliedSkillId,
                skill_template_id: targetSkillTemplateId,
                boost_points_added: newBoostPoints
                // Можно добавить имя скилла и т.д., если нужно сразу обновить UI
            },
            remainingBoostQuantity: newBoostQuantity 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[UserID: ${currentUserId}] ApplyBoost: Ошибка при применении буста для карты ${userCardId}:`, error.message, error.stack);
        res.status(500).json({ message: error.message || "Ошибка сервера при применении буста." });
    } finally {
        client.release();
    }
});
router.get('/all-skill-templates', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, description, applicable_to_role FROM player_skill_templates ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения всех шаблонов скиллов:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});
router.post('/player-cards/:userCardId/add-skill', authMiddleware, async (req, res) => {
    const currentUserId = req.user.userId;
    const userCardIdParam = req.params.userCardId;
    const { skill_template_id_to_add } = req.body;

    // 1. Валидация входных данных
    if (isNaN(parseInt(userCardIdParam)) || isNaN(parseInt(skill_template_id_to_add))) {
        return res.status(400).json({ message: "Некорректные ID (карта или шаблон скилла)." });
    }
    const userCardId = parseInt(userCardIdParam);
    const skillTemplateIdToAdd = parseInt(skill_template_id_to_add);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log(`[UserID: ${currentUserId}] AddSkill: Начало транзакции для карты ${userCardId}, скилл ${skillTemplateIdToAdd}`);

        // 2. Проверка, что карта принадлежит пользователю и получение ее "родной" позиции
        const cardOwnerCheck = await client.query(
            'SELECT uc.id, c.position AS card_native_position FROM user_cards uc JOIN cards c ON uc.card_template_id = c.id WHERE uc.id = $1 AND uc.user_id = $2',
            [userCardId, currentUserId]
        );
        if (cardOwnerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Карта игрока не найдена или не принадлежит вам." });
        }
        const cardNativePosition = cardOwnerCheck.rows[0].card_native_position;

        // 3. Проверка, что у карты < 4 скиллов
        const existingSkillsCountResult = await client.query(
            'SELECT COUNT(*) as count FROM user_card_applied_skills WHERE user_card_id = $1',
            [userCardId]
        );
        const existingSkillsCount = parseInt(existingSkillsCountResult.rows[0].count, 10);
        if (existingSkillsCount >= 4) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "У игрока уже максимальное количество (4) активных скиллов." });
        }

        // 4. Проверка, что такой скилл еще не добавлен к карте
        const skillAlreadyExistsCheck = await client.query(
            'SELECT id FROM user_card_applied_skills WHERE user_card_id = $1 AND skill_template_id = $2',
            [userCardId, skillTemplateIdToAdd]
        );
        if (skillAlreadyExistsCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "Этот скилл уже добавлен данной карте." });
        }

        // 5. Проверка совместимости скилла с позицией игрока
        const skillTemplateCheck = await client.query(
            'SELECT applicable_to_role FROM player_skill_templates WHERE id = $1',
            [skillTemplateIdToAdd]
        );
        if (skillTemplateCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Шаблон скилла не найден." });
        }
        const skillRole = skillTemplateCheck.rows[0].applicable_to_role; // 'Field', 'Goaltender', 'All'
        let cardRole = '';
        if (cardNativePosition === 'Goaltender') cardRole = 'Goaltender';
        else if (['Forward', 'Defenseman'].includes(cardNativePosition)) cardRole = 'Field';

        if (skillRole !== 'All' && skillRole !== cardRole) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Этот скилл (${skillRole}) не может быть применен к игроку этой позиции (${cardNativePosition} -> ${cardRole}).` });
        }

        // 6. INSERT в user_card_applied_skills с boost_points_added = 0
        const insertResult = await client.query(
            'INSERT INTO user_card_applied_skills (user_card_id, skill_template_id, boost_points_added) VALUES ($1, $2, 0) RETURNING id, skill_template_id, boost_points_added',
            [userCardId, skillTemplateIdToAdd]
        );
        const newAppliedSkill = insertResult.rows[0];
        console.log(`[UserID: ${currentUserId}] AddSkill: Скилл ID ${newAppliedSkill.id} успешно добавлен к карте ${userCardId}`);
        
        await client.query('COMMIT');
        console.log(`[UserID: ${currentUserId}] AddSkill: Транзакция ЗАФИКСИРОВАНА.`);
        
        // Для консистентности с другими эндпоинтами, вернем также имя и описание скилла
        const finalSkillDataResult = await pool.query( // Новый запрос вне транзакции, т.к. транзакция уже завершена
             `SELECT ucas.id AS applied_skill_id, ucas.skill_template_id, pst.name AS skill_name, 
                     pst.description AS skill_description, pst.applicable_to_role, ucas.boost_points_added
              FROM user_card_applied_skills ucas
              JOIN player_skill_templates pst ON ucas.skill_template_id = pst.id
              WHERE ucas.id = $1`,
            [newAppliedSkill.id]
        );

        res.status(201).json({
            message: "Скилл успешно добавлен к карте игрока!",
            addedSkill: finalSkillDataResult.rows[0] || newAppliedSkill // Отдаем полные данные, если смогли их получить
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[UserID: ${currentUserId}] AddSkill: Ошибка при добавлении скилла к карте ${userCardId}:`, error.message, error.stack);
        res.status(500).json({ message: error.message || "Ошибка сервера при добавлении скилла." });
    } finally {
        client.release();
    }
});

module.exports = router;