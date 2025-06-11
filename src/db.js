// src/db.js
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
            team_name_changes_count: 0
          };
          storage.users.push(newUser);
          return { rows: [{ id, username, email }] };
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
          return { rows: [], rowCount: 0 };
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