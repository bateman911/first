// src/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Check if we're in a development environment without database
const isDevelopment = !process.env.DATABASE_URL && !process.env.DB_HOST;

let pool;

if (isDevelopment) {
    console.log('⚠️  Development mode: Database not configured');
    console.log('📝 To connect to a database:');
    console.log('   1. Click "Connect to Supabase" button in the top right');
    console.log('   2. Set up your Supabase project');
    console.log('   3. The environment variables will be automatically configured');
    
    // Create a mock pool for development
    pool = {
        query: async () => {
            throw new Error('Database not configured. Please connect to Supabase first.');
        },
        connect: async () => {
            throw new Error('Database not configured. Please connect to Supabase first.');
        },
        on: () => {},
        end: async () => {}
    };
} else {
    // Use DATABASE_URL if available (Supabase format), otherwise use individual variables
    const connectionConfig = process.env.DATABASE_URL ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    } : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || "5432", 10),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

    pool = new Pool(connectionConfig);

    pool.on('connect', (client) => {
        console.log('✅ New database connection established');
    });

    pool.on('error', (err, client) => {
        console.error('❌ Unexpected error on idle database client', err);
    });

    // Test connection
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('❌ Database connection test failed:', err.message);
            console.log('💡 Make sure your database is running and connection details are correct');
        } else {
            console.log('✅ Database connected successfully! Server time:', res.rows[0].now);
        }
    });
}

module.exports = pool;