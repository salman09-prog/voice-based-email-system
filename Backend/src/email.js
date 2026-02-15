const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const express = require("express");
const router = express.Router();
var Imap = require("imap");
const simpleParser = require("mailparser").simpleParser;
const { SUCCESS, NOT_AUTH, UNEXPECTED } = require("./error_codes.js");


// 1. Fetch Emails Route
router.post("/fetch_emails", function (req, response) {
  if (req.session.address) {
    try {
      const cleanPassword = req.session.password.replace(/ /g, "");

      // IMAP CONFIGURATION
      get_emails(
        new Imap({
          user: req.session.address,
          password: cleanPassword,
          host: "imap.gmail.com",
          port: 993,
          tlsOptions: { rejectUnauthorized: false },
          tls: true,
          authTimeout: 20000, // Increased timeout
          connTimeout: 20000,
        }),
        req.body["search"],
        (err, emails) => {
          if (err) {
            console.log("IMAP Error:", err);
            response.send({
              code: UNEXPECTED,
              detail: "Fetch Error: " + (err.message || err),
              data: null,
            });
          } else {
            response.send({
              code: SUCCESS,
              detail: "Success",
              data: emails,
            });
          }
        },
      );
    } catch (e) {
      console.log("IMAP Crash:", e);
      response.send({
        code: UNEXPECTED,
        detail: "Server Crash: " + e.message,
        data: null,
      });
    }
  } else {
    response.send({
      code: NOT_AUTH,
      detail: "User not authenticated",
      data: null,
    });
  }
});

// 2. Send Email Route
router.post("/send_email", async (req, res) => {
  if (!req.session.tokens) {
    return res.send({
      code: NOT_AUTH,
      detail: "User not authenticated",
      data: null,
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials(req.session.tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const body = req.body;

  const message = [
    `From: ${req.session.address}`,
    `To: ${body.to}`,
    `Subject: ${body.subject}`,
    "",
    body.content,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    res.send({ code: SUCCESS, detail: "Success", data: null });
  } catch (err) {
    console.log(err);
    res.send({
      code: UNEXPECTED,
      detail: "Send Error",
      data: null,
    });
  }
});



// Helper: Send Email (FORCE IPv4 & SSL)
async function write_email(options, content, callback) {
  try {
    const transporter = nodemailer.createTransport({
      host: "74.125.140.108", // One IPv4 of smtp.gmail.com
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: options.user,
        pass: options.pass,
      },
      tls: {
        servername: "smtp.gmail.com", // IMPORTANT for SSL
        rejectUnauthorized: false,
      },
      connectionTimeout: 20000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    await transporter.verify(); // Helps catch connection issues early

    const info = await transporter.sendMail({
      from: options.user,
      to: options.to,
      subject: options.subject,
      text: content,
    });

    callback(null, info);
  } catch (error) {
    callback(error, null);
  }
}

// Helper: Fetch Emails
function get_emails(imap, search_str, callback) {
  var emails = [];
  var isDone = false;

  imap.once("error", function (err) {
    if (!isDone) {
      isDone = true;
      callback(err, null);
    }
  });

  imap.once("end", function () {
    if (!isDone) {
      isDone = true;
      callback(null, emails);
    }
  });

  imap.once("ready", function () {
    openBox(function (err, box) {
      if (err) {
        imap.end();
        return;
      }

      const totalMessages = box.messages.total;
      if (totalMessages === 0) {
        imap.end();
        return;
      }

      const start = Math.max(1, totalMessages - 9);
      const fetchRange = `${start}:${totalMessages}`;

      var f = imap.seq.fetch(fetchRange, { bodies: "" });

      f.on("message", function (msg, seqno) {
        msg.on("body", function (stream, info) {
          const chunks = [];
          stream.on("data", function (chunk) {
            chunks.push(chunk);
          });
          stream.on("end", function () {
            simpleParser(Buffer.concat(chunks).toString(), (err, mail) => {
              if (mail) {
                emails.unshift({
                  target:
                    search_str === "INBOX"
                      ? mail.from?.text || "Unknown"
                      : mail.to?.text || "Unknown",
                  subject: mail.subject || "No Subject",
                  content: mail.text || "",
                });
              }
            });
          });
        });
      });

      f.once("error", function (err) {
        console.log("Fetch error: " + err);
      });
      f.once("end", function () {
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
        if (boxes && boxes["[Gmail]"] && boxes["[Gmail]"].children) {
          const children = boxes["[Gmail]"].children;
          for (let key in children) {
            if (children[key].attribs.some((a) => a === "\\Sent")) {
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
