const express = require('express')
var session = require('express-session');
var bodyParser = require('body-parser');
const cors = require('cors'); // Make sure to require this
const {sign_in, login, logout, fetch_user, delete_user} = require("./src/auth.js")
const {fetch_emails, send_email} = require("./src/email.js")

const app = express()
app.use(cors({
    origin: [
        "https://voice-based-email-system.vercel.app", // Your Vercel Frontend
        "http://localhost:3000" // Keep this for local testing
    ],
    credentials: true // Important for cookies/sessions to work
}));

//port number is to be changed according to deployed platform
const port = 8080

//Middleware for parsing incoming requests
app.use(bodyParser.json()); 

//Middleware for inserting session to incoming  requests
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // MUST be true for Vercel/Render (HTTPS)
        sameSite: 'none', // MUST be 'none' to allow Cross-Site cookies
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));


app.post('/api/auth/sign_in', sign_in);             //accepts(JSON)  username, password, address 
app.post('/api/auth/login', login);                 //accepts(JSON)  password, address 
app.get('/api/auth/logout', logout);                // null get request
app.get('/api/auth/fetch_user', fetch_user);        //null
app.get('/api/auth/delete_user', delete_user);      //null
app.post('/api/email/send_email', send_email);      //accepts(JSON) subject, to, content
app.post('/api/email/fetch_emails', fetch_emails);  //null

//Start listening requests
app.listen(port, () => console.log(`Server is listening on port ${port}!`))