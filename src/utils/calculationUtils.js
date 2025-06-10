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
            const affectedStatKeys = SKILL_TO_STAT_MAP_SERVER[skill.skill_name]; // Используем серверную карту
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

module.exports = { calculateModifiedStatsOnServer };