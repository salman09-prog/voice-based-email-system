const { Pool } = require('pg');

// Use the Environment Variable provided by Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render connections
});

module.exports = { pool };