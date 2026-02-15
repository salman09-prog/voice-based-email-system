const express = require('express');
const router = express.Router();
var Imap = require('imap');
const Gmail = require('gmail-send');
const simpleParser = require('mailparser').simpleParser;
const {SUCCESS, NOT_AUTH, UNEXPECTED} = require("./error_codes.js");

// 1. Fetch Emails Route (Fetch only last 10 to prevent crash)
router.post('/fetch_emails', function(req, response) {
    if (req.session.address) {
        try {
            get_emails(new Imap({
                user: req.session.address,
                password: req.session.password, 
                host: 'imap.gmail.com', 
                port: 993,
                tlsOptions: { rejectUnauthorized: false },
                tls: true,
                authTimeout: 10000 
            }), req.body["search"], (err, emails) => {
                if (err) {
                    console.log("IMAP Logic Error:", err);
                    response.send({
                        code: UNEXPECTED,
                        detail: "Could not fetch emails. Ensure you used a Google App Password.",
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
            response.send({ code: UNEXPECTED, detail: "Server Error", data: null });
        }
    } else {
        response.send({
            code: NOT_AUTH,
            detail: "user not authenticated",
            data: null
        });
    }
});

// 2. Send Email Route
router.post('/send_email', function(req, response) {
    if (req.session.address) {
        const body = req.body;
        write_email({
            user: req.session.address,
            pass: req.session.password,
            to:   body["to"],
            subject: body["subject"]
        }, body["content"], (err, res) => {
            if (err) {
                console.log("Send Error:", err);
                response.send({ code: UNEXPECTED, detail: "Failed to send. Check Password.", data: null });
            } else {
                response.send({ code: SUCCESS, detail: "Success", data: null });
            }
        });
    } else {
        response.send({ code: NOT_AUTH, detail: "user not authenticated", data: null });
    }
});

// Helper: Send Email
function write_email(options, content, callback) {
    try {
        const send = Gmail(options);
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

    // 1. Handle Connection Errors
    imap.once('error', function(err) {
        console.log("IMAP Connection Error:", err);
        if(!isDone) {
            isDone = true;
            callback(err, null);
        }
    });

    imap.once('end', function() {
        console.log('Connection ended');
        if(!isDone) {
            isDone = true;
            callback(null, emails);
        }
    });

    // 2. Connect and Open Box
    imap.once('ready', function() {
        openBox(function(err, box) {
            if (err) {
                imap.end();
                return;
            }
            
            // --- Fetch only last 10 messages ---
            const totalMessages = box.messages.total;
            
            if (totalMessages === 0) {
                imap.end();
                return;
            }

            const start = Math.max(1, totalMessages - 9); 
            const fetchRange = `${start}:${totalMessages}`;

            console.log(`Fetching messages from ${fetchRange}`);

            var f = imap.seq.fetch(fetchRange, { bodies: '' });
            
            f.on('message', function(msg, seqno) {
                msg.on('body', function(stream, info) {
                    const chunks = [];
                    stream.on("data", function (chunk) { chunks.push(chunk); });
                    stream.on("end", function () {
                        simpleParser(Buffer.concat(chunks).toString(), (err, mail) => {
                            if(mail) {
                                // Add to beginning of array so newest is first
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
                console.log('Done fetching!');
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
                            sentBox = "[Gmail]/" + key;
                            break;
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