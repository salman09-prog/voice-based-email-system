const express = require('express');
const router = express.Router(); // Create the router
const { createHash } = require('crypto');

// FIX: Changed ".." to "." because db.js is in the same folder
const { pool } = require("./db.js"); 
const { UNEXPECTED, SUCCESS, NOT_FOUND, NOT_AUTH } = require("./error_codes.js");

// SHA256 function for hashing passwords
function computeSHA256(str) {
  const hash = createHash('sha256');
  hash.write(str);
  return hash.digest('hex');
}

// 1. Sign In Route (POST)
router.post('/sign_in', function(req, response) {
    const body = req.body;
    const address = body["address"] ? body["address"].trim() : "";
    const username = body["username"] ? body["username"].trim() : "";
    const password = body["password"] ? body["password"].trim() : ""; 
    const hash = computeSHA256(password);
    
    pool.query("INSERT INTO users (username, address, hash) VALUES ($1, $2, $3)", [username, address, hash], (err, res) => {
        if (err) {
            console.log(err);
            response.send({
                code: "DB_ERROR", // Fallback if err.code is missing
                detail: err.detail || "Database Error",
                data: null
            });
        } else {
            // Manually set session data
            if(req.session) {
                req.session.address = address;
                req.session.password = password;
                req.session.username = username;
            }
            
            response.send({
                code: SUCCESS,
                detail: "Success",
                data: null
            });
        }
    });   
});

// 2. Login Route (POST)
router.post('/login', function(req, response) {
    const body = req.body;
    const password = body["password"] ? body["password"].trim() : "";
    const address = body["address"] ? body["address"].trim() : "";
    const hash = computeSHA256(password);
    
    pool.query("SELECT username FROM users WHERE hash = $1 AND address = $2", [hash, address], (err, res) => {
        if (err) {
            console.log(err);
            response.send({
                code: "DB_ERROR",
                detail: err.detail || "Database Error",
                data: null
            });
        } else {
            if (res.rows.length === 0){
                response.send({
                    code: NOT_FOUND,
                    detail: "Email address or the password is invalid",
                    data: null
                });
            } else {
                if(req.session) {
                    req.session.address = address;
                    req.session.password = password;
                    req.session.username = res.rows[0]["username"];
                }
                
                response.send({
                    code: SUCCESS,
                    detail: "Success",
                    data: null
                });
            }
        }
    });
});

// 3. Fetch User Route (GET)
router.get('/fetch_user', function(req, response) {
    if(req.session && req.session.address) {
        response.send({
            code: SUCCESS,
            detail: "Success",
            data: {
                username: req.session.username,
                address: req.session.address
            }
        });
    } else {
        response.send({
            code: NOT_AUTH,
            detail: "user not authenticated",
            data: null
        });
    }
});

// 4. Delete User Route (POST)
router.post('/delete_user', function(req, response) {
    if(req.session && req.session.address) {
        pool.query("DELETE FROM users WHERE address = $1", [req.session.address], (err, res) => {
            if (err) {
                console.log(err);
                response.send({
                    code: "DB_ERROR",
                    detail: err.detail || "Database Error",
                    data: null
                });
            } else {
                response.send({
                    code: SUCCESS,
                    detail: "Success",
                    data: null
                });
            }
        });
    } else {
        response.send({
            code: NOT_AUTH,
            detail: "user not authenticated",
            data: null
        });
    }
});

// 5. Logout Route (GET)
router.get('/logout', function(req, response) {
    if (req.session) {
        req.session.destroy(err => {
            if(err) {
                response.send({
                    code: UNEXPECTED,
                    detail: "Unexpected Error",
                    data: null
                });
            } else {
                response.send({
                    code: SUCCESS,
                    detail: "Success",
                    data: null
                });
            }
        });
    } else {
        response.send({
            code: SUCCESS,
            detail: "Success",
            data: null
        });
    }
});

// Export the Router
module.exports = router;