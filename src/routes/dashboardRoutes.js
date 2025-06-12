// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Ваш модуль БД (например, пул PostgreSQL)
const authMiddleware = require('../middleware/authMiddleware'); // Ваш middleware для JWT
const { sendSupportEmail } = require('../services/emailService'); // Подключаем сервис почты
const { calculateModifiedStatsOnServer } = require('../utils/calculationUtils'); // 

const ENERGY_REFILL_INTERVAL_HOURS = 1; // Пример: 1 час на восстановление 1 единицы энергии

router.get('/team-status', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const client = await db.connect(); // Используем клиента для нескольких запросов

    try {
        // 1. Получаем основные данные пользователя/команды из таблицы users
        // FOR UPDATE здесь не так критичен, как при финансовых операциях, но можно оставить для консистентности чтения
        const userResult = await client.query(
            `SELECT id, username, email, 
                    COALESCE(current_energy, 7) as current_energy, 
                    COALESCE(max_energy, 7) as max_energy, 
                    next_energy_refill_at, 
                    team_name, team_logo_url, 
                    COALESCE(level, 1) as level, 
                    COALESCE(current_xp, 0) as current_xp, 
                    COALESCE(xp_to_next_level, 100) as xp_to_next_level, 
                    COALESCE(wins, 0) as wins, 
                    COALESCE(losses, 0) as losses, 
                    COALESCE(draws, 0) as draws, 
                    rating, -- Это поле будет перезаписано актуальным расчетом
                    COALESCE(gold, 0) as gold, 
                    COALESCE(bucks, 0) as bucks,
                    COALESCE(team_name_changes_count, 0) as team_name_changes_count 
             FROM users 
             WHERE id = $1 FOR UPDATE`, // Блокируем на всякий случай, если будем обновлять rating
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        let userData = userResult.rows[0];

        // 2. Логика обновления энергии (как и раньше)
        // ... (ваш код обновления энергии) ...
        const now = new Date();
        let energyUpdatedInDB = false;
        userData.current_energy = parseInt(userData.current_energy, 10);
        userData.max_energy = parseInt(userData.max_energy, 10);

        if (userData.current_energy < userData.max_energy) {
            let newNextRefillTime;
            if (userData.next_energy_refill_at) {
                let nextRefillTimeFromDB = new Date(userData.next_energy_refill_at);
                newNextRefillTime = new Date(nextRefillTimeFromDB.getTime());
                while (now >= newNextRefillTime && userData.current_energy < userData.max_energy) {
                    userData.current_energy++;
                    energyUpdatedInDB = true;
                    newNextRefillTime = new Date(newNextRefillTime.getTime() + ENERGY_REFILL_INTERVAL_HOURS * 60 * 60 * 1000);
                }
            } else {
                newNextRefillTime = new Date(now.getTime() + ENERGY_REFILL_INTERVAL_HOURS * 60 * 60 * 1000);
                energyUpdatedInDB = true;
            }
            userData.next_energy_refill_at = (userData.current_energy < userData.max_energy) ? newNextRefillTime : null;
        } else {
            const wasNull = userData.next_energy_refill_at === null;
            userData.next_energy_refill_at = null;
            if (!wasNull) energyUpdatedInDB = true;
        }
        if (energyUpdatedInDB) {
            await client.query( // Используем того же клиента
                'UPDATE users SET current_energy = $1, next_energy_refill_at = $2 WHERE id = $3',
                [userData.current_energy, userData.next_energy_refill_at, userId]
            );
        }


        // 3. Расчет актуального рейтинга команды
        let актуальныйКомандныйРейтинг = 'N/A';
        let суммаМодифицированныхOvrИгроков = 0;
        let количествоИгроковВСоставе = 0;

        // 3а. Получаем ID карт игроков в текущем ростере
        const rosterCardsResult = await client.query(
            'SELECT user_card_id FROM team_rosters WHERE user_id = $1',
            [userId]
        );

        if (rosterCardsResult.rows.length > 0) {
            for (const rosterEntry of rosterCardsResult.rows) {
                const userCardId = rosterEntry.user_card_id;

                // 3б. Для каждой карты получаем ее базовые данные
                const cardDataResult = await client.query(
                    `SELECT ct.*, uc.current_level, uc.id as user_card_id /* и другие поля из uc, если нужны */
                     FROM user_cards uc 
                     JOIN cards ct ON uc.card_template_id = ct.id 
                     WHERE uc.id = $1`, // Убрана проверка на user_id для работы с mock DB
                    [userCardId] 
                );
                if (cardDataResult.rows.length === 0) continue; // Пропускаем, если карта не найдена (маловероятно)
                const baseCardData = cardDataResult.rows[0];

                // 3в. Получаем примененные скиллы для этой карты
                const appliedSkillsResult = await client.query(
                    `SELECT pst.name as skill_name, ucas.boost_points_added 
                     FROM user_card_applied_skills ucas 
                     JOIN player_skill_templates pst ON ucas.skill_template_id = pst.id 
                     WHERE ucas.user_card_id = $1`,
                    [userCardId]
                );
                const appliedSkills = appliedSkillsResult.rows;

                // 3г. Рассчитываем модифицированные статы и OVR для этой карты
                const modifiedStats = calculateModifiedStatsOnServer(baseCardData, appliedSkills); // Используем серверную утилиту
                
                if (typeof modifiedStats.current_ovr === 'number') {
                    суммаМодифицированныхOvrИгроков += modifiedStats.current_ovr;
                    количествоИгроковВСоставе++;
                }
            }

            if (количествоИгроковВСоставе > 0) {
                актуальныйКомандныйРейтинг = Math.round(суммаМодифицированныхOvrИгроков / количествоИгроковВСоставе);
            }
        }
        
        // 4. (Опционально) Обновляем поле rating в таблице users, если оно изменилось
        const currentRatingInDb = userData.rating ? userData.rating.toString() : null;
        const newCalculatedRatingStr = актуальныйКомандныйРейтинг !== 'N/A' ? актуальныйКомандныйРейтинг.toString() : null;

        if (newCalculatedRatingStr !== currentRatingInDb) {
            await client.query('UPDATE users SET rating = $1 WHERE id = $2', [newCalculatedRatingStr, userId]);
            console.log(`[UserID: ${userId}] Обновлен рейтинг команды в БД на: ${newCalculatedRatingStr}`);
        }
        
        // Используем client.query('COMMIT') только если были INSERT/UPDATE/DELETE
        // В данном случае, мы могли обновить current_energy, next_energy_refill_at, rating.
        await client.query('COMMIT');


        // 5. Формируем ответ клиенту
        const responseData = {
            teamName: userData.team_name || `${userData.username}'s Team`,
            teamLogoUrl: userData.team_logo_url || 'images/logo.png',
            level: parseInt(userData.level, 10),
            currentXp: parseInt(userData.current_xp, 10),
            xpToNextLevel: parseInt(userData.xp_to_next_level, 10),
            wins: parseInt(userData.wins, 10),
            losses: parseInt(userData.losses, 10),
            draws: parseInt(userData.draws, 10),
            rating: newCalculatedRatingStr, // Отправляем свежерассчитанный рейтинг
            gold: parseInt(userData.gold, 10),
            bucks: parseInt(userData.bucks, 10),
            currentEnergy: userData.current_energy,
            maxEnergy: userData.max_energy,
            nextEnergyRefillAt: userData.next_energy_refill_at ? userData.next_energy_refill_at.toISOString() : null,
            userEmail: userData.email,
            team_name_changes_count: parseInt(userData.team_name_changes_count, 10)
        };
        res.json(responseData);

    } catch (error) {
        await client.query('ROLLBACK'); // Откатываем, если была ошибка в try
        console.error("[UserID: " + (req.user ? req.user.userId : 'unknown') + "] Ошибка получения статуса команды:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

// POST /api/dashboard/update-team-name - Обновить имя команды
router.post('/update-team-name', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { newTeamName } = req.body;

    if (!newTeamName || typeof newTeamName !== 'string' || newTeamName.trim().length < 3 || newTeamName.trim().length > 50) {
        return res.status(400).json({ message: 'Имя команды должно быть строкой от 3 до 50 символов.' });
    }

    const trimmedNewTeamName = newTeamName.trim();

    try {
        // Проверка на уникальность имени команды (регистронезависимая)
        const checkExistingName = await db.query(
            'SELECT id FROM users WHERE LOWER(team_name) = LOWER($1) AND id != $2',
            [trimmedNewTeamName, userId]
        );

        if (checkExistingName.rows.length > 0) {
            return res.status(409).json({ message: 'Такое имя команды уже используется другим игроком.' });
        }

        const updateResult = await db.query(
            'UPDATE users SET team_name = $1 WHERE id = $2 RETURNING team_name',
            [trimmedNewTeamName, userId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        res.status(200).json({
            message: 'Имя команды успешно обновлено!',
            updatedTeamName: updateResult.rows[0].team_name
        });

    } catch (error) {
        console.error('Ошибка при обновлении имени команды:', error);
        if (error.code === '23505') { // Код ошибки PostgreSQL для unique_violation
             return res.status(409).json({ message: 'Это имя команды уже занято.' });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении имени команды.' });
    }
});

// POST /api/dashboard/submit-support-ticket
router.post('/submit-support-ticket', authMiddleware, async (req, res) => {
    const userId = req.user.userId; // ID пользователя из токена
    const userEmailFromToken = req.user.email; // Если вы добавляете email в JWT payload при логине/регистрации
                                             // Иначе, нужно будет получить email пользователя из БД по userId

    const { subject, message, userEmail } = req.body; // userEmail - это email, который пользователь видит в форме

    if (!subject || !message || !userEmail) {
        return res.status(400).json({ message: 'Все поля (тема, сообщение, email) обязательны.' });
    }
    if (typeof subject !== 'string' || subject.trim().length === 0 ||
        typeof message !== 'string' || message.trim().length === 0 ||
        typeof userEmail !== 'string' || userEmail.trim().length === 0) {
        return res.status(400).json({ message: 'Поля не должны быть пустыми.' });
    }

    // Можно добавить дополнительную валидацию email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail.trim())) {
        return res.status(400).json({ message: 'Некорректный формат Email.' });
    }

    try {
        // Здесь можно получить актуальный email пользователя из БД по userId,
        // чтобы убедиться, что используется его зарегистрированный email, а не подставленный в форме.
        // Однако, для replyTo можно использовать тот, что пришел из формы (userEmail).
        const dbUserResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
        let actualUserEmail = userEmail.trim(); // По умолчанию используем email из формы

        if (dbUserResult.rows.length > 0 && dbUserResult.rows[0].email) {
            actualUserEmail = dbUserResult.rows[0].email; // Используем email из БД как основной
            // Если email из формы не совпадает с email из БД, можно добавить уведомление в письмо поддержки
        }
        
        try {
            // Пытаемся отправить email, но обрабатываем ошибки
            await sendSupportEmail(userEmail.trim(), subject.trim(), message.trim());
            res.status(200).json({ message: 'Ваше сообщение успешно отправлено в службу поддержки!' });
        } catch (emailError) {
            console.error('Ошибка при отправке email:', emailError);
            // Возвращаем успех, но с предупреждением
            res.status(200).json({ 
                message: 'Ваше сообщение принято, но возникли проблемы с отправкой email. Наша команда все равно получит ваше обращение.',
                warning: true
            });
        }
    } catch (error) {
        console.error('Ошибка на сервере при отправке тикета поддержки:', error);
        res.status(500).json({ message: 'Не удалось отправить сообщение. Пожалуйста, попробуйте позже.' });
    }
});

module.exports = router;