const { Pool } = require('pg')

//Configurations for the database connection
//There should be changed according the deployed platform
exports.pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mail_system',
    password: 'postgres',
    port: 5432,
})

