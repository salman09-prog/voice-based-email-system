const express = require('express');
const router = express.Router();
var Imap = require('imap');
const Gmail = require('gmail-send');
const simpleParser = require('mailparser').simpleParser;
const {SUCCESS, NOT_AUTH, UNEXPECTED} = require("./error_codes.js");

// 1. Fetch Emails Route
router.post('/fetch_emails', function(req, response) {
    if (req.session.address) {
        try {
            const cleanPassword = req.session.password.replace(/ /g, '');
            
            // IMAP CONFIGURATION
            get_emails(new Imap({
                user: req.session.address,
                password: cleanPassword, 
                host: 'imap.gmail.com', 
                port: 993,
                tlsOptions: { rejectUnauthorized: false },
                tls: true,
                authTimeout: 20000, // Increased timeout
                connTimeout: 20000
            }), req.body["search"], (err, emails) => {
                if (err) {
                    console.log("IMAP Error:", err);
                    response.send({
                        code: UNEXPECTED,
                        detail: "Fetch Error: " + (err.message || err),
                        data: null
                    });
                } else {
                    response.send({
                        code: SUCCESS,
                        detail: "Success",
                        data: emails
                    });
                }
            });
        } catch (e) {
            console.log("IMAP Crash:", e);
            response.send({ code: UNEXPECTED, detail: "Server Crash: " + e.message, data: null });
        }
    } else {
        response.send({ code: NOT_AUTH, detail: "User not authenticated", data: null });
    }
});

// 2. Send Email Route
router.post('/send_email', function(req, response) {
    if (req.session.address) {
        const body = req.body;
        const cleanPassword = req.session.password.replace(/ /g, '');

        write_email({
            user: req.session.address,
            pass: cleanPassword,
            to:   body["to"],
            subject: body["subject"]
        }, body["content"], (err, res) => {
            if (err) {
                console.log("Send Error:", err);
                response.send({ 
                    code: UNEXPECTED, 
                    detail: "Send Error: " + (err.message || "Timeout"), 
                    data: null 
                });
            } else {
                response.send({ code: SUCCESS, detail: "Success", data: null });
            }
        });
    } else {
        response.send({ code: NOT_AUTH, detail: "User not authenticated", data: null });
    }
});

// Helper: Send Email (FORCE IPv4 & SSL)
function write_email(options, content, callback) {
    try {
        const send = Gmail({
            user: options.user,
            pass: options.pass,
            to:   options.to,
            subject: options.subject,
            host: 'smtp.gmail.com', // Explicit Host
            port: 465,              // Explicit Port (SSL)
            secure: true,           // Required for 465
            connectionTimeout: 20000, // 20 Seconds Timeout
            greetingTimeout: 10000,
            socketTimeout: 20000,
            tls: {
                rejectUnauthorized: false
            },
            // CRITICAL FIX: FORCE IPv4
            // (Render sometimes fails with IPv6 on Gmail)
            family: 4 
        });

        send({ text: content }, (error, result) => {
            if (error) callback(error, null);
            else callback(null, result);
        });
    } catch(e) {
        callback(e, null);
    }
}

// Helper: Fetch Emails
function get_emails(imap, search_str, callback) {
    var emails = [];
    var isDone = false;

    imap.once('error', function(err) {
        if(!isDone) { isDone = true; callback(err, null); }
    });

    imap.once('end', function() {
        if(!isDone) { isDone = true; callback(null, emails); }
    });

    imap.once('ready', function() {
        openBox(function(err, box) {
            if (err) { imap.end(); return; }
            
            const totalMessages = box.messages.total;
            if (totalMessages === 0) { imap.end(); return; }

            const start = Math.max(1, totalMessages - 9); 
            const fetchRange = `${start}:${totalMessages}`;

            var f = imap.seq.fetch(fetchRange, { bodies: '' });
            
            f.on('message', function(msg, seqno) {
                msg.on('body', function(stream, info) {
                    const chunks = [];
                    stream.on("data", function (chunk) { chunks.push(chunk); });
                    stream.on("end", function () {
                        simpleParser(Buffer.concat(chunks).toString(), (err, mail) => {
                            if(mail) {
                                emails.unshift({
                                    target: (search_str === "INBOX") ? (mail.from?.text || "Unknown") : (mail.to?.text || "Unknown"),
                                    subject: mail.subject || "No Subject",
                                    content: mail.text || ""
                                });
                            }
                        });
                    });
                });
            });

            f.once('error', function(err) { console.log('Fetch error: ' + err); });
            f.once('end', function() {
                setTimeout(() => imap.end(), 1000);
            });
        });
    });

    imap.connect();

    function openBox(cb) {
        imap.getBoxes((err, boxes) => {
            if (err) return cb(err);
            if (search_str === "SENT") {
                let sentBox = "Sent"; 
                if(boxes && boxes["[Gmail]"] && boxes["[Gmail]"].children) {
                    const children = boxes["[Gmail]"].children;
                    for (let key in children) {
                        if (children[key].attribs.some(a => a === "\\Sent")) {
                            sentBox = "[Gmail]/" + key; break;
                        }
                    }
                }
                imap.openBox(sentBox, true, cb);
            } else {
                imap.openBox("INBOX", true, cb);
            }
        });
    }
}

module.exports = router;