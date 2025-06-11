// src/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Mock database for development when no real database is available
const createMockDb = () => {
  console.log('⚠️  Using mock database - functionality will be limited');
  
  // In-memory storage
  const storage = {
    users: [],
    cards: [],
    user_cards: [],
    team_rosters: [],
    user_big_impact_cards: [],
    big_impact_card_templates: [],
    user_boosts_inventory: [],
    user_card_applied_skills: [],
    player_skill_templates: [],
    user_contracts_inventory: [],
    contract_item_templates: []
  };
  
  // Last ID tracking for auto-increment
  const lastIds = {
    users: 0,
    cards: 0,
    user_cards: 0,
    team_rosters: 0,
    user_big_impact_cards: 0,
    big_impact_card_templates: 0,
    user_boosts_inventory: 0,
    user_card_applied_skills: 0,
    player_skill_templates: 0,
    user_contracts_inventory: 0,
    contract_item_templates: 0
  };
  
  return {
    query: async (text, params) => {
      console.log('Mock DB Query:', { text, params });
      
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
          team_name_changes_count: 0
        };
        storage.users.push(newUser);
        return { rows: [{ id, username, email }] };
      }
      
      // Default response for unhandled queries
      return { rows: [], rowCount: 0 };
    },
    connect: async () => {
      return {
        query: async (text, params) => {
          console.log('Mock DB Client Query:', { text, params });
          return { rows: [], rowCount: 0 };
        },
        release: () => {},
        on: () => {}
      };
    },
    on: () => {}
  };
};

// Determine if we should use a real database or mock - synchronously
let pool;

try {
  // Check if we have database configuration
  const dbUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST;
  
  if (!dbUrl && !dbHost) {
    console.log('⚠️  No database configuration found - using mock database');
    pool = createMockDb();
  } else {
    // Configure real database connection
    const connectionConfig = dbUrl ? 
      { connectionString: dbUrl } : 
      {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || "5432", 10)
      };
    
    try {
      pool = new Pool(connectionConfig);
      
      pool.on('connect', () => {
        console.log('✅ Connected to PostgreSQL database');
      });
      
      pool.on('error', (err) => {
        console.error('❌ Unexpected error on idle PostgreSQL client', err);
        // Don't reassign pool here as it would cause race conditions
      });
      
      console.log('✅ PostgreSQL pool initialized');
    } catch (poolError) {
      console.error('❌ Error creating PostgreSQL pool:', poolError.message);
      console.log('⚠️  Falling back to mock database');
      pool = createMockDb();
    }
  }
} catch (error) {
  console.error('❌ Error initializing database connection:', error);
  console.log('⚠️  Falling back to mock database');
  pool = createMockDb();
}

module.exports = pool;