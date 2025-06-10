// src/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || "5432", 10),
});

pool.on('connect', (client) => {
    // Можно что-то сделать при каждом новом соединении, если нужно
    // console.log('Новое соединение с БД установлено');
});

pool.on('error', (err, client) => {
  console.error('Неожиданная ошибка на простаивающем клиенте БД', err);
  // process.exit(-1); // Рассмотрите возможность перезапуска приложения при серьезных ошибках пула
});

// Проверка соединения при старте (можно оставить или убрать, если pool.on('error') достаточно)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Ошибка тестового запроса к PostgreSQL:', err);
  } else {
    console.log('Успешное подключение к PostgreSQL! Текущее время сервера:', res.rows[0].now);
  }
});

// Экспортируем сам пул
module.exports = pool;