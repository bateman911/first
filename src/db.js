// src/db.js
require('dotenv').config();

// Mock database for development when no real database is available
const createMockDb = () => {
  console.log('⚠️  Using mock database - functionality will be limited');
  
  // In-memory storage
  const storage = {
    users: [],
    cards: [
      {
        id: 1,
        player_name: 'Ivan Grozny',
        image_url: 'forward.png',
        position: 'Forward',
        rarity: 'Epic',
        base_attack: 85,
        base_defense: 70,
        base_speed: 75,
        base_stamina: 80,
        description: 'Legend forward',
        base_ovr: 77,
        tier: 'gold',
        base_skating: 75,
        base_shooting: 85,
        base_passing: 80,
        base_defense_skill: 70,
        base_physical: 75,
        base_reflexes: 50,
        base_puck_control: 80,
        base_positioning: 50
      },
      {
        id: 2,
        player_name: 'Petr Faster',
        image_url: 'forward.png',
        position: 'Forward',
        rarity: 'Rare',
        base_attack: 70,
        base_defense: 60,
        base_speed: 85,
        base_stamina: 70,
        description: 'Speed forward',
        base_ovr: 71,
        tier: 'silver',
        base_skating: 85,
        base_shooting: 70,
        base_passing: 65,
        base_defense_skill: 60,
        base_physical: 65,
        base_reflexes: 50,
        base_puck_control: 70,
        base_positioning: 50
      },
      {
        id: 3,
        player_name: 'Sergey Stena',
        image_url: 'defenseman.png',
        position: 'Defenseman',
        rarity: 'Rare',
        base_attack: 60,
        base_defense: 85,
        base_speed: 65,
        base_stamina: 75,
        description: 'Good defensman',
        base_ovr: 71,
        tier: 'silver',
        base_skating: 65,
        base_shooting: 55,
        base_passing: 70,
        base_defense_skill: 85,
        base_physical: 80,
        base_reflexes: 50,
        base_puck_control: 75,
        base_positioning: 50
      },
      {
        id: 4,
        player_name: 'Victor Chezh',
        image_url: 'goaltender.png',
        position: 'Goaltender',
        rarity: 'Common',
        base_attack: 30,
        base_defense: 80,
        base_speed: 40,
        base_stamina: 60,
        description: 'Goalkeeper',
        base_ovr: 62,
        tier: 'bronze',
        base_skating: 40,
        base_shooting: 30,
        base_passing: 35,
        base_defense_skill: 50,
        base_physical: 60,
        base_reflexes: 80,
        base_puck_control: 75,
        base_positioning: 85
      },
      {
        id: 5,
        player_name: 'Alex Young',
        image_url: 'forward.png',
        position: 'Forward',
        rarity: 'Common',
        base_attack: 50,
        base_defense: 55,
        base_speed: 50,
        base_stamina: 50,
        description: 'Young player (18 y.o.)',
        base_ovr: 51,
        tier: 'bronze',
        base_skating: 50,
        base_shooting: 50,
        base_passing: 55,
        base_defense_skill: 55,
        base_physical: 50,
        base_reflexes: 50,
        base_puck_control: 55,
        base_positioning: 50
      },
      {
        id: 6,
        player_name: 'Alex Radulov',
        image_url: 'forward.png',
        position: 'Forward',
        rarity: 'Epic',
        base_attack: 85,
        base_defense: 80,
        base_speed: 85,
        base_stamina: 75,
        description: 'Legend',
        base_ovr: 81,
        tier: 'gold',
        base_skating: 85,
        base_shooting: 85,
        base_passing: 80,
        base_defense_skill: 80,
        base_physical: 80,
        base_reflexes: 50,
        base_puck_control: 85,
        base_positioning: 50
      },
      {
        id: 7,
        player_name: 'Nikita Nesterov',
        image_url: 'defenseman.png',
        position: 'Defenseman',
        rarity: 'Epic',
        base_attack: 70,
        base_defense: 75,
        base_speed: 80,
        base_stamina: 85,
        description: 'Legend defenseman',
        base_ovr: 77,
        tier: 'gold',
        base_skating: 80,
        base_shooting: 65,
        base_passing: 75,
        base_defense_skill: 75,
        base_physical: 85,
        base_reflexes: 50,
        base_puck_control: 80,
        base_positioning: 50
      },
      {
        id: 8,
        player_name: 'Sergei Mestnov',
        image_url: 'defenseman.png',
        position: 'Defenseman',
        rarity: 'Common',
        base_attack: 55,
        base_defense: 50,
        base_speed: 49,
        base_stamina: 53,
        description: 'Defenseman',
        base_ovr: 52,
        tier: 'bronze',
        base_skating: 49,
        base_shooting: 50,
        base_passing: 55,
        base_defense_skill: 50,
        base_physical: 55,
        base_reflexes: 50,
        base_puck_control: 55,
        base_positioning: 50
      }
    ],
    user_cards: [
      // Pre-populate with sample data for user 1
      {
        id: 1,
        user_id: 1,
        card_template_id: 1,
        current_level: 1,
        experience_points: 0,
        acquired_at: new Date().toISOString(),
        games_remaining: 20,
        renewals_left: 5
      },
      {
        id: 2,
        user_id: 1,
        card_template_id: 2,
        current_level: 1,
        experience_points: 0,
        acquired_at: new Date().toISOString(),
        games_remaining: 20,
        renewals_left: 5
      },
      {
        id: 3,
        user_id: 1,
        card_template_id: 3,
        current_level: 1,
        experience_points: 0,
        acquired_at: new Date().toISOString(),
        games_remaining: 20,
        renewals_left: 5
      },
      {
        id: 4,
        user_id: 1,
        card_template_id: 4,
        current_level: 1,
        experience_points: 0,
        acquired_at: new Date().toISOString(),
        games_remaining: 20,
        renewals_left: 5
      },
      {
        id: 5,
        user_id: 1,
        card_template_id: 5,
        current_level: 1,
        experience_points: 0,
        acquired_at: new Date().toISOString(),
        games_remaining: 20,
        renewals_left: 5
      },
      {
        id: 6,
        user_id: 1,
        card_template_id: 6,
        current_level: 1,
        experience_points: 0,
        acquired_at: new Date().toISOString(),
        games_remaining: 20,
        renewals_left: 5
      },
      {
        id: 7,
        user_id: 1,
        card_template_id: 7,
        current_level: 1,
        experience_points: 0,
        acquired_at: new Date().toISOString(),
        games_remaining: 20,
        renewals_left: 5
      },
      {
        id: 8,
        user_id: 1,
        card_template_id: 8,
        current_level: 1,
        experience_points: 0,
        acquired_at: new Date().toISOString(),
        games_remaining: 20,
        renewals_left: 5
      }
    ],
    team_rosters: [],
    user_big_impact_cards: [],
    big_impact_card_templates: [
      {
        id: 1,
        name: 'Tape-to-Tape',
        description: 'Позволяет игрокам отдавать более резкие и качественные пасы.',
        card_type: 'Синяя',
        image_url: 'bi_tape_to_tape.png',
        effect_details: {"stat_boost": {"skill": "passing", "target": "team", "duration_type": "match_long", "value_percent": 15}}
      },
      {
        id: 2,
        name: 'Puck Luck',
        description: 'Повышает шанс забросить шайбу отскоком от штанги.',
        card_type: 'Золотая',
        image_url: 'bi_puck_luck.png',
        effect_details: {"special_effect": "puck_luck", "chance_increase": 0.20}
      },
      {
        id: 3,
        name: 'Sharpshooter',
        description: 'Увеличивает точность бросков по воротам.',
        card_type: 'Синяя',
        image_url: 'bi_sharpshooter.png',
        effect_details: {"stat_boost": {"skill": "shooting_accuracy", "target": "team", "duration_type": "match_long", "value_percent": 20}}
      }
    ],
    user_boosts_inventory: [],
    user_card_applied_skills: [],
    player_skill_templates: [
      {
        id: 1,
        name: 'Shot',
        description: 'Улучшает точность и силу броска',
        applicable_to_role: 'Field'
      },
      {
        id: 2,
        name: 'Pass',
        description: 'Улучшает точность и скорость паса',
        applicable_to_role: 'Field'
      },
      {
        id: 3,
        name: 'Skate',
        description: 'Увеличивает скорость катания',
        applicable_to_role: 'All'
      },
      {
        id: 4,
        name: 'Stick Handle',
        description: 'Улучшает контроль шайбы',
        applicable_to_role: 'Field'
      }
    ],
    user_contracts_inventory: [],
    contract_item_templates: [
      {
        id: 1,
        name: 'Зеленый Контракт',
        description: 'Продлевает контракт на 15-49 игр',
        quality: 'Green',
        games_added_min: 15,
        games_added_max: 49,
        image_url: 'contract_green.png'
      },
      {
        id: 2,
        name: 'Золотой Контракт',
        description: 'Значительно продлевает контракт на 50-100 игр',
        quality: 'Gold',
        games_added_min: 50,
        games_added_max: 100,
        image_url: 'contract_gold.png'
      }
    ],
    boost_templates: [
      {
        id: 1,
        name: 'Зеленый Буст Броска',
        description: 'Улучшает навык броска',
        quality: 'Green',
        points_value: 5,
        target_skill_template_id: 1,
        image_url: 'boost_shot_green.png'
      },
      {
        id: 2,
        name: 'Золотой Буст Броска',
        description: 'Значительно улучшает навык броска',
        quality: 'Gold',
        points_value: 15,
        target_skill_template_id: 1,
        image_url: 'boost_shot_gold.png'
      }
    ]
  };
  
  // Last ID tracking for auto-increment
  const lastIds = {
    users: 0,
    cards: 8,
    user_cards: 8,
    team_rosters: 0,
    user_big_impact_cards: 0,
    big_impact_card_templates: 3,
    user_boosts_inventory: 0,
    user_card_applied_skills: 0,
    player_skill_templates: 4,
    user_contracts_inventory: 0,
    contract_item_templates: 2,
    boost_templates: 2
  };
  
  return {
    query: async (text, params) => {
      console.log('Mock DB Query:', { text, params });
      
      try {
        // Handle basic queries
        if (text.includes('SELECT * FROM users WHERE email =')) {
          const email = params[0];
          const user = storage.users.find(u => u.email === email);
          return { rows: user ? [user] : [] };
        }
        
        if (text.includes('INSERT INTO users')) {
          const [username, email, password_hash] = params;
          const id = ++lastIds.users;
          const newUser = { 
            id, 
            username, 
            email, 
            password_hash,
            created_at: new Date().toISOString(),
            current_energy: 7,
            max_energy: 7,
            level: 1,
            current_xp: 0,
            xp_to_next_level: 100,
            wins: 0,
            losses: 0,
            draws: 0,
            gold: 0,
            bucks: 0,
            team_name_changes_count: 0,
            team_chemistry_points: 0
          };
          storage.users.push(newUser);
          return { rows: [{ id, username, email }] };
        }
        
        // Handle card ownership check - FIX: Use parameters directly without parseInt
        if (text.includes('SELECT id FROM user_cards WHERE id =') && text.includes('AND user_id =')) {
          const userCardId = params[0];
          const userId = params[1];
          const userCard = storage.user_cards.find(uc => uc.id === userCardId && uc.user_id === userId);
          return { rows: userCard ? [{ id: userCard.id }] : [] };
        }
        
        // Handle COUNT queries for user_card_applied_skills
        if (text.includes('SELECT COUNT(*) FROM user_card_applied_skills')) {
          const userCardId = params[0];
          const count = storage.user_card_applied_skills.filter(s => s.user_card_id === parseInt(userCardId)).length;
          return { rows: [{ count }] };
        }
        
        // Handle card queries
        if (text.includes('SELECT COUNT(*) FROM user_cards WHERE user_id =')) {
          const userId = params[0];
          const count = storage.user_cards.filter(uc => uc.user_id === userId).length;
          return { rows: [{ count }] };
        }
        
        if (text.includes('INSERT INTO user_cards')) {
          const [userId, cardTemplateId] = params;
          const id = ++lastIds.user_cards;
          const newUserCard = {
            id,
            user_id: userId,
            card_template_id: cardTemplateId,
            current_level: 1,
            experience_points: 0,
            acquired_at: new Date().toISOString(),
            games_remaining: 20,
            renewals_left: 5
          };
          storage.user_cards.push(newUserCard);
          return { rows: [{ id, card_template_id: cardTemplateId }] };
        }
        
        if (text.includes('SELECT') && text.includes('FROM user_cards') && text.includes('JOIN cards')) {
          // This is for /api/cards/my-cards
          const userId = params[0];
          const userCards = storage.user_cards.filter(uc => uc.user_id === userId);
          
          const result = userCards.map(uc => {
            const cardTemplate = storage.cards.find(c => c.id === uc.card_template_id);
            if (!cardTemplate) return null;
            
            return {
              user_card_id: uc.id,
              current_level: uc.current_level,
              experience_points: uc.experience_points,
              acquired_at: uc.acquired_at,
              games_remaining: uc.games_remaining,
              renewals_left: uc.renewals_left,
              card_template_id: cardTemplate.id,
              player_name: cardTemplate.player_name,
              image_url: cardTemplate.image_url,
              position: cardTemplate.position,
              rarity: cardTemplate.rarity,
              base_attack: cardTemplate.base_attack,
              base_defense: cardTemplate.base_defense,
              base_speed: cardTemplate.base_speed,
              base_stamina: cardTemplate.base_stamina,
              base_ovr: cardTemplate.base_ovr,
              tier: cardTemplate.tier,
              description: cardTemplate.description,
              base_skating: cardTemplate.base_skating,
              base_shooting: cardTemplate.base_shooting,
              base_passing: cardTemplate.base_passing,
              base_defense_skill: cardTemplate.base_defense_skill,
              base_physical: cardTemplate.base_physical,
              base_reflexes: cardTemplate.base_reflexes,
              base_puck_control: cardTemplate.base_puck_control,
              base_positioning: cardTemplate.base_positioning,
              applied_skills: []
            };
          }).filter(Boolean);
          
          return { rows: result };
        }
        
        // Improved team roster handling
        if (text.includes('SELECT') && text.includes('FROM team_rosters')) {
          const userId = params[0];
          const userRosters = storage.team_rosters.filter(tr => tr.user_id === userId);
          
          // Enhanced roster data with card details
          const result = userRosters.map(tr => {
            const userCard = storage.user_cards.find(uc => uc.id === tr.user_card_id);
            if (!userCard) return null;
            
            const cardTemplate = storage.cards.find(c => c.id === userCard.card_template_id);
            if (!cardTemplate) return null;
            
            return {
              field_position: tr.field_position,
              user_card_id: tr.user_card_id,
              card_template_id: cardTemplate.id,
              player_name: cardTemplate.player_name,
              image_url: cardTemplate.image_url,
              card_actual_position: cardTemplate.position,
              rarity: cardTemplate.rarity,
              base_attack: cardTemplate.base_attack,
              base_defense: cardTemplate.base_defense,
              base_speed: cardTemplate.base_speed,
              base_stamina: cardTemplate.base_stamina,
              base_ovr: cardTemplate.base_ovr,
              tier: cardTemplate.tier,
              current_level: userCard.current_level
            };
          }).filter(Boolean);
          
          return { rows: result, rowCount: result.length };
        }
        
        // Handle DELETE FROM team_rosters
        if (text.includes('DELETE FROM team_rosters WHERE user_id =')) {
          const userId = params[0];
          const initialCount = storage.team_rosters.length;
          storage.team_rosters = storage.team_rosters.filter(tr => tr.user_id !== userId);
          const rowCount = initialCount - storage.team_rosters.length;
          console.log(`Deleted ${rowCount} team roster entries for user ${userId}`);
          return { rowCount };
        }
        
        // Handle INSERT INTO team_rosters
        if (text.includes('INSERT INTO team_rosters')) {
          const [userId, fieldPosition, userCardId] = params;
          
          // Check if the user card exists and belongs to the user
          const userCard = storage.user_cards.find(uc => uc.id === userCardId && uc.user_id === userId);
          if (!userCard) {
            throw new Error(`Card with ID ${userCardId} does not belong to user ${userId} or does not exist.`);
          }
          
          // Check if the position is already taken
          const existingPosition = storage.team_rosters.find(tr => 
            tr.user_id === userId && tr.field_position === fieldPosition
          );
          if (existingPosition) {
            // Update existing position
            existingPosition.user_card_id = userCardId;
            console.log(`Updated roster position ${fieldPosition} for user ${userId} with card ${userCardId}`);
            return { rowCount: 1 };
          } else {
            // Add new position
            const id = ++lastIds.team_rosters;
            storage.team_rosters.push({
              id,
              user_id: userId,
              field_position: fieldPosition,
              user_card_id: userCardId
            });
            console.log(`Added new roster position ${fieldPosition} for user ${userId} with card ${userCardId}`);
            return { rowCount: 1 };
          }
        }
        
        // Handle UPDATE users SET team_chemistry_points
        if (text.includes('UPDATE users SET team_chemistry_points =')) {
          const [chemistryPoints, userId] = params;
          const user = storage.users.find(u => u.id === userId);
          if (user) {
            user.team_chemistry_points = chemistryPoints;
            console.log(`Updated team_chemistry_points to ${chemistryPoints} for user ${userId}`);
            return { rowCount: 1 };
          }
          return { rowCount: 0 };
        }
        
        if (text.includes('SELECT') && text.includes('FROM user_big_impact_cards')) {
          const userId = params[0];
          const userBiCards = storage.user_big_impact_cards.filter(ub => ub.user_id === userId);
          
          const result = userBiCards.map(ub => {
            const template = storage.big_impact_card_templates.find(t => t.id === ub.template_id);
            if (!template) return null;
            
            return {
              user_bi_card_id: ub.id,
              quantity: ub.quantity,
              template_id: template.id,
              name: template.name,
              description: template.description,
              card_type: template.card_type,
              image_url: template.image_url,
              effect_details: template.effect_details
            };
          }).filter(Boolean);
          
          return { rows: result };
        }
        
        if (text.includes('SELECT') && text.includes('FROM player_skill_templates')) {
          return { rows: storage.player_skill_templates };
        }
        
        if (text.includes('SELECT') && text.includes('FROM user_card_applied_skills')) {
          const userCardId = params[0];
          const appliedSkills = storage.user_card_applied_skills.filter(s => s.user_card_id === userCardId);
          
          const result = appliedSkills.map(as => {
            const template = storage.player_skill_templates.find(t => t.id === as.skill_template_id);
            if (!template) return null;
            
            return {
              applied_skill_id: as.id,
              skill_template_id: template.id,
              skill_name: template.name,
              skill_description: template.description,
              applicable_to_role: template.applicable_to_role,
              boost_points_added: as.boost_points_added
            };
          }).filter(Boolean);
          
          return { rows: result };
        }
        
        if (text.includes('SELECT') && text.includes('FROM user_boosts_inventory')) {
          const userId = params[0];
          const userBoosts = storage.user_boosts_inventory.filter(ub => ub.user_id === userId);
          
          const result = userBoosts.map(ub => {
            const template = storage.boost_templates.find(t => t.id === ub.boost_template_id);
            if (!template) return null;
            
            const skillTemplate = storage.player_skill_templates.find(s => s.id === template.target_skill_template_id);
            
            return {
              user_boost_inventory_id: ub.id,
              quantity: ub.quantity,
              boost_template_id: template.id,
              boost_name: template.name,
              boost_description: template.description,
              boost_quality: template.quality,
              boost_points_value: template.points_value,
              target_skill_template_id: template.target_skill_template_id,
              target_skill_name: skillTemplate ? skillTemplate.name : null,
              boost_image_url: template.image_url
            };
          }).filter(Boolean);
          
          return { rows: result };
        }
        
        if (text.includes('SELECT') && text.includes('FROM user_contracts_inventory')) {
          const userId = params[0];
          const userContracts = storage.user_contracts_inventory.filter(uc => uc.user_id === userId);
          
          const result = userContracts.map(uc => {
            const template = storage.contract_item_templates.find(t => t.id === uc.contract_template_id);
            if (!template) return null;
            
            return {
              user_contract_inventory_id: uc.id,
              quantity: uc.quantity,
              contract_template_id: template.id,
              contract_name: template.name,
              contract_description: template.description,
              contract_quality: template.quality,
              games_added_min: template.games_added_min,
              games_added_max: template.games_added_max,
              contract_image_url: template.image_url
            };
          }).filter(Boolean);
          
          return { rows: result };
        }
        
        // Handle dashboard queries
        if (text.includes('SELECT') && text.includes('FROM users') && text.includes('FOR UPDATE')) {
          const userId = params[0];
          const user = storage.users.find(u => u.id === userId);
          return { rows: user ? [user] : [] };
        }
        
        // Handle starter pack
        if (text.includes('SELECT id FROM cards WHERE position =')) {
          const position = params[0];
          const cards = storage.cards.filter(c => c.position === position);
          return { rows: cards.map(c => ({ id: c.id })) };
        }
        
        // Handle team chemistry points query
        if (text.includes('SELECT team_chemistry_points FROM users WHERE id =')) {
          const userId = params[0];
          const user = storage.users.find(u => u.id === userId);
          return { rows: user ? [{ team_chemistry_points: user.team_chemistry_points || 0 }] : [] };
        }
        
        // Handle card position query for chemistry calculation
        if (text.includes('SELECT uc.id as user_card_id, c.position as native_card_position')) {
          const cardIds = params[0];
          const results = [];
          
          // For each card ID in the array
          cardIds.forEach(cardId => {
            const userCard = storage.user_cards.find(uc => uc.id === cardId);
            if (userCard) {
              const cardTemplate = storage.cards.find(c => c.id === userCard.card_template_id);
              if (cardTemplate) {
                results.push({
                  user_card_id: userCard.id,
                  native_card_position: cardTemplate.position
                });
              }
            }
          });
          
          return { rows: results };
        }
        
        // Fix for INSERT INTO user_card_applied_skills
        if (text.includes('INSERT INTO user_card_applied_skills')) {
          const [userCardId, skillTemplateId, boostPointsAdded] = params;
          const id = ++lastIds.user_card_applied_skills;
          
          // Create the new applied skill
          const newAppliedSkill = {
            id,
            user_card_id: parseInt(userCardId),
            skill_template_id: parseInt(skillTemplateId),
            boost_points_added: parseInt(boostPointsAdded) || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Add to storage
          storage.user_card_applied_skills.push(newAppliedSkill);
          
          console.log(`Added new skill ${skillTemplateId} to card ${userCardId} with ${boostPointsAdded} points`);
          return { rows: [{ id }] };
        }
        
        // Fix for UPDATE user_card_applied_skills
        if (text.includes('UPDATE user_card_applied_skills SET boost_points_added =')) {
          const [newBoostPoints, appliedSkillId] = params;
          const appliedSkill = storage.user_card_applied_skills.find(as => as.id === appliedSkillId);
          
          if (appliedSkill) {
            appliedSkill.boost_points_added = parseInt(newBoostPoints);
            appliedSkill.updated_at = new Date().toISOString();
            console.log(`Updated skill ${appliedSkill.skill_template_id} for card ${appliedSkill.user_card_id} to ${newBoostPoints} points`);
            return { rowCount: 1 };
          }
          
          return { rowCount: 0 };
        }
        
        // Default response for unhandled queries
        return { rows: [], rowCount: 0 };
      } catch (error) {
        console.error('Mock DB Query Error:', error);
        return { rows: [], rowCount: 0 };
      }
    },
    connect: async () => {
      return {
        query: async (text, params) => {
          console.log('Mock DB Client Query:', { text, params });
          
          // Handle transaction queries
          if (text === 'BEGIN') {
            return { rows: [], rowCount: 0 };
          }
          
          if (text === 'COMMIT') {
            return { rows: [], rowCount: 0 };
          }
          
          if (text === 'ROLLBACK') {
            return { rows: [], rowCount: 0 };
          }
          
          // Forward to the main query handler
          return await module.exports.query(text, params);
        },
        release: () => {},
        on: () => {}
      };
    },
    on: () => {},
    end: () => Promise.resolve(),
    isMock: true
  };
};

// Initialize database connection with better error handling
async function initializeDatabase() {
  try {
    // Check if we have database configuration
    const dbUrl = process.env.DATABASE_URL;
    const dbHost = process.env.DB_HOST;
    
    if (!dbUrl && !dbHost) {
      console.log('⚠️  No database configuration found - using mock database');
      return createMockDb();
    }

    // Only require pg module when we actually need it
    const { Pool } = require('pg');
    
    // Configure real database connection with better error handling
    const connectionConfig = dbUrl ? 
      { 
        connectionString: dbUrl,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 10
      } : 
      {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || "5432", 10),
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 10
      };
    
    const pool = new Pool(connectionConfig);
    
    // Test the connection with timeout
    const testConnection = async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
        console.log('✅ Connected to PostgreSQL database');
        return true;
      } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        return false;
      } finally {
        client.release();
      }
    };

    // Test connection with timeout
    const connectionTest = Promise.race([
      testConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);

    const isConnected = await connectionTest;
    
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }

    pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle PostgreSQL client', err);
    });
    
    pool.isMock = false;
    return pool;
    
  } catch (error) {
    console.error('❌ Error initializing database connection:', error.message);
    console.log('⚠️  Falling back to mock database');
    return createMockDb();
  }
}

// Initialize the pool
let pool;

const initPool = async () => {
  if (!pool) {
    pool = await initializeDatabase();
  }
  return pool;
};

// Export a proxy that initializes the pool on first use
module.exports = new Proxy({}, {
  get(target, prop) {
    if (prop === 'query') {
      return async (...args) => {
        const db = await initPool();
        return db.query(...args);
      };
    }
    if (prop === 'connect') {
      return async (...args) => {
        const db = await initPool();
        
        // Check if this is a mock database and bypass connection test
        if (db.isMock) {
          return {
            query: db.query,
            release: () => {},
            on: () => {}
          };
        }
        
        return db.connect(...args);
      };
    }
    if (prop === 'on') {
      return async (...args) => {
        const db = await initPool();
        return db.on(...args);
      };
    }
    if (prop === 'end') {
      return async (...args) => {
        const db = await initPool();
        return db.end(...args);
      };
    }
    if (prop === 'isMock') {
      return (async () => {
        const db = await initPool();
        return db.isMock;
      })();
    }
    return target[prop];
  }
});