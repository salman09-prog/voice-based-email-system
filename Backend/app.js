const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// 1. Database Connection (Ensure this matches your Render info)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render
});

// 2. CORS Configuration (MUST BE AT THE TOP)
app.use(cors({
    origin: [
        "https://voice-based-email-system.vercel.app", // Your Vercel Frontend
        "http://localhost:3000" // For local testing
    ],
    credentials: true, // Allow cookies
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
}));

// 3. Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 4. Session Configuration
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: "secret_key_change_this",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Must be true for HTTPS (Render/Vercel)
        sameSite: 'none', // Must be 'none' for Cross-Site cookies
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// 5. Load Routes (This fixes the 404 Error!)
// Make sure you have these files in src/server/routes/
const auth = require('./src/auth')
const email = require('./src/email');

// 6. Use Routes
// This tells the server: "If URL starts with /auth, go to auth.js"
app.use('/auth', auth);   
app.use('/email', email);

// 7. Test Route (To check if server is alive)
app.get('/', (req, res) => {
    res.send("Backend is running!");
});

// 8. Start Server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});