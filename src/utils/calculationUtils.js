// src/utils/calculationUtils.js
const SKILL_TO_STAT_MAP_SERVER = {
    'Shot': ['base_shooting', 'base_attack'],
    'Pass': ['base_passing'],
    'Skate': ['base_speed', 'base_skating'],
    'Stick Handle': ['base_puck_control'],
    'Defend': ['base_defense', 'base_defense_skill'],
    'Reaction': ['base_reflexes'],
    'Recovery': ['base_stamina'],
    'Hands': ['base_puck_control']
};

function calculateOvrOnServer(detailedStats, cardPosition) {
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
        if (typeof detailedStats[statKey] === 'number') {
            ovrSum += detailedStats[statKey];
            ovrCount++;
        }
    });
    return ovrCount > 0 ? Math.round(ovrSum / ovrCount) : (detailedStats.base_ovr || 0);
}

function calculateModifiedStatsOnServer(baseCardData, appliedSkills) {
    if (!baseCardData) return { current_ovr: 0 };
    
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
            const affectedStatKeys = SKILL_TO_STAT_MAP_SERVER[skill.skill_name];
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
    modifiedStats.current_ovr = calculateOvrOnServer(modifiedStats, baseCardData.position);
    return modifiedStats;
}

/**
 * Применяет штрафы и бонусы к статам игрока для симуляции матча
 * @param {Object} modifiedStats - Базовые модифицированные статы (с учетом скиллов)
 * @param {Object} contractInfo - Информация о контракте {games_remaining, renewals_left}
 * @param {number} teamChemistryPoints - Очки сыгранности команды (0-6)
 * @param {Array} bigImpactEffects - Массив эффектов от Big Impact карт
 * @returns {Object} Финальные боевые статы для симуляции
 */
function calculateBattleStatsForMatch(modifiedStats, contractInfo, teamChemistryPoints = 0, bigImpactEffects = []) {
    const battleStats = { ...modifiedStats };
    
    // 1. Применяем штраф от контракта
    const gamesRemaining = contractInfo?.games_remaining || 0;
    const renewalsLeft = contractInfo?.renewals_left || 0;
    
    // Штраф 50% если контракт истек
    const contractExpired = gamesRemaining <= 0;
    const isOldPlayer = renewalsLeft <= 0 && gamesRemaining <= 0;
    
    if (contractExpired) {
        console.log(`Применяем штраф за истекший контракт: games_remaining=${gamesRemaining}, renewals_left=${renewalsLeft}`);
        // Применяем штраф ко всем статам кроме current_ovr (он пересчитается)
        Object.keys(battleStats).forEach(statKey => {
            if (statKey !== 'current_ovr' && typeof battleStats[statKey] === 'number') {
                battleStats[statKey] = Math.floor(battleStats[statKey] * 0.5); // -50%
            }
        });
    }
    
    // 2. Применяем бонус от сыгранности команды
    if (teamChemistryPoints >= 6) {
        console.log(`Применяем бонус за максимальную сыгранность: +5 ко всем статам`);
        Object.keys(battleStats).forEach(statKey => {
            if (statKey !== 'current_ovr' && typeof battleStats[statKey] === 'number') {
                battleStats[statKey] += 5;
            }
        });
    }
    
    // 3. Применяем эффекты от Big Impact карт
    if (bigImpactEffects && bigImpactEffects.length > 0) {
        bigImpactEffects.forEach(effect => {
            if (effect.type === 'stat_boost') {
                const { stat_name, value_percent, value_flat } = effect;
                if (stat_name && battleStats[stat_name] !== undefined) {
                    if (value_percent) {
                        battleStats[stat_name] = Math.floor(battleStats[stat_name] * (1 + value_percent / 100));
                    }
                    if (value_flat) {
                        battleStats[stat_name] += value_flat;
                    }
                }
            }
            // Здесь можно добавить обработку других типов эффектов
        });
    }
    
    // 4. Пересчитываем OVR с учетом всех модификаторов
    battleStats.current_ovr = calculateOvrOnServer(battleStats, modifiedStats.position || 'Forward');
    
    return battleStats;
}

/**
 * Загружает и рассчитывает боевые статы для всех игроков команды
 * @param {number} userId - ID пользователя
 * @param {Object} dbClient - Клиент базы данных
 * @param {Array} selectedBigImpactCards - Выбранные Big Impact карты для матча
 * @returns {Array} Массив игроков с их боевыми статами
 */
async function loadTeamBattleStats(userId, dbClient, selectedBigImpactCards = []) {
    try {
        // 1. Получаем состав команды
        const rosterResult = await dbClient.query(
            'SELECT user_card_id, field_position FROM team_rosters WHERE user_id = $1',
            [userId]
        );
        
        if (rosterResult.rows.length === 0) {
            throw new Error('Команда не укомплектована');
        }
        
        // 2. Получаем сыгранность команды
        const chemistryResult = await dbClient.query(
            'SELECT team_chemistry_points FROM users WHERE id = $1',
            [userId]
        );
        const teamChemistryPoints = chemistryResult.rows[0]?.team_chemistry_points || 0;
        
        // 3. Обрабатываем Big Impact эффекты
        const bigImpactEffects = [];
        if (selectedBigImpactCards.length > 0) {
            const biCardIds = selectedBigImpactCards.map(card => card.template_id);
            const biEffectsResult = await dbClient.query(
                'SELECT effect_details FROM big_impact_card_templates WHERE id = ANY($1::int[])',
                [biCardIds]
            );
            
            biEffectsResult.rows.forEach(row => {
                if (row.effect_details) {
                    // Парсим эффекты из JSON
                    const effects = Array.isArray(row.effect_details) ? row.effect_details : [row.effect_details];
                    bigImpactEffects.push(...effects);
                }
            });
        }
        
        // 4. Для каждого игрока в составе рассчитываем боевые статы
        const teamBattleStats = [];
        
        for (const rosterEntry of rosterResult.rows) {
            const userCardId = rosterEntry.user_card_id;
            const fieldPosition = rosterEntry.field_position;
            
            // Получаем базовые данные карты
            const cardDataResult = await dbClient.query(
                `SELECT uc.*, c.* FROM user_cards uc 
                 JOIN cards c ON uc.card_template_id = c.id 
                 WHERE uc.id = $1`,
                [userCardId]
            );
            
            if (cardDataResult.rows.length === 0) continue;
            const baseCardData = cardDataResult.rows[0];
            
            // Получаем примененные скиллы
            const skillsResult = await dbClient.query(
                `SELECT pst.name as skill_name, ucas.boost_points_added 
                 FROM user_card_applied_skills ucas 
                 JOIN player_skill_templates pst ON ucas.skill_template_id = pst.id 
                 WHERE ucas.user_card_id = $1`,
                [userCardId]
            );
            const appliedSkills = skillsResult.rows;
            
            // Рассчитываем модифицированные статы (базовые + скиллы)
            const modifiedStats = calculateModifiedStatsOnServer(baseCardData, appliedSkills);
            
            // Рассчитываем финальные боевые статы
            const contractInfo = {
                games_remaining: baseCardData.games_remaining,
                renewals_left: baseCardData.renewals_left
            };
            
            const battleStats = calculateBattleStatsForMatch(
                modifiedStats, 
                contractInfo, 
                teamChemistryPoints, 
                bigImpactEffects
            );
            
            teamBattleStats.push({
                user_card_id: userCardId,
                field_position: fieldPosition,
                player_name: baseCardData.player_name,
                position: baseCardData.position,
                battle_stats: battleStats,
                contract_info: contractInfo
            });
        }
        
        return teamBattleStats;
        
    } catch (error) {
        console.error('Ошибка при загрузке боевых статов команды:', error);
        throw error;
    }
}

/**
 * Уменьшает games_remaining для всех игроков, участвовавших в матче
 * @param {Array} participantUserCardIds - Массив ID карт игроков
 * @param {Object} dbClient - Клиент базы данных
 */
async function reduceGamesRemainingAfterMatch(participantUserCardIds, dbClient) {
    if (!participantUserCardIds || participantUserCardIds.length === 0) {
        return;
    }
    
    try {
        const result = await dbClient.query(
            'UPDATE user_cards SET games_remaining = GREATEST(games_remaining - 1, 0) WHERE id = ANY($1::int[])',
            [participantUserCardIds]
        );
        
        console.log(`Уменьшено games_remaining для ${result.rowCount} игроков после матча`);
        return result.rowCount;
        
    } catch (error) {
        console.error('Ошибка при уменьшении games_remaining:', error);
        throw error;
    }
}

module.exports = { 
    calculateModifiedStatsOnServer,
    calculateBattleStatsForMatch,
    loadTeamBattleStats,
    reduceGamesRemainingAfterMatch
};