const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// --- FIX: Import the database connection here! ---
const { pool } = require('./src/db'); 
// ------------------------------------------------

// 2. CORS Configuration
app.use(cors({
    origin: [
        "https://voice-based-email-system.vercel.app", 
        "http://localhost:3000"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// 3. Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 4. Session Configuration
app.set('trust proxy', 1);
app.use(session({
    store: new pgSession({
        pool: pool, // Now 'pool' is defined because we imported it above
        tableName: 'session'
    }),
    secret: "secret_key_change_this",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, 
        sameSite: 'none', 
        maxAge: 30 * 24 * 60 * 60 * 1000 
    }
}));

// 5. Load Routes
const auth = require('./src/auth');
const email = require('./src/email');

// 6. Use Routes
app.use('/auth', auth);   
app.use('/email', email);

// 7. Test Route
app.get('/', (req, res) => {
    res.send("Backend is running!");
});

// 8. Start Server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});