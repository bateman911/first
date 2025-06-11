// src/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Check if we're in a development environment without PostgreSQL
// Parse POSTGRES_AVAILABLE as boolean since env vars are strings
const postgresAvailable = process.env.POSTGRES_AVAILABLE === 'true';
const isDevelopmentWithoutDB = process.env.NODE_ENV === 'development' && !postgresAvailable;

let pool = null;

if (isDevelopmentWithoutDB) {
  // Mock pool for development without PostgreSQL
  console.log('Running in development mode without PostgreSQL - using mock database');
  
  pool = {
    query: (text, params, callback) => {
      console.log('Mock DB Query:', text, params ? `with params: ${JSON.stringify(params)}` : '');
      
      // Handle callback or promise style
      if (typeof callback === 'function') {
        setTimeout(() => callback(null, { rows: [], rowCount: 0 }), 10);
        return;
      }
      
      // Return a promise for non-callback usage
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
    connect: () => {
      console.log('Mock DB connection established');
      return Promise.resolve({
        query: (text, params) => {
          console.log('Mock DB Query (from connection):', text, params ? `with params: ${JSON.stringify(params)}` : '');
          return Promise.resolve({ rows: [], rowCount: 0 });
        },
        release: () => {
          console.log('Mock DB connection released');
        }
      });
    },
    end: () => {
      console.log('Mock DB pool ended');
      return Promise.resolve();
    },
    on: (event, handler) => {
      console.log(`Mock DB pool event listener registered for: ${event}`);
    }
  };
} else {
  // Real PostgreSQL pool
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    // Add connection timeout and retry settings
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

  pool.on('connect', (client) => {
    console.log('Новое соединение с БД установлено');
  });

  pool.on('error', (err, client) => {
    console.error('Неожиданная ошибка на простаивающем клиенте БД', err);
    // Don't exit the process, just log the error
  });

  // Test connection with proper error handling
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Ошибка тестового запроса к PostgreSQL:', err.message);
      console.log('Приложение продолжит работу в режиме без базы данных');
    } else {
      console.log('Успешное подключение к PostgreSQL! Текущее время сервера:', res.rows[0].now);
    }
  });
}

// Export the pool (real or mock)
module.exports = pool;