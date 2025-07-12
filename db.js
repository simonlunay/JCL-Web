const { Pool } = require('pg');
require('dotenv').config({ path: './pass.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;