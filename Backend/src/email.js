// eslint-disable-no-redeclare
import React from 'react';
import './email.css';
import Axios from 'axios';
import { SUCCESS } from './error_codes.js';
import Speech2Text from "./s2t.js";
import Spell2Text from "./spell2text.js"

var synth = window.speechSynthesis //for text to speech
var allText = []        //Keeps the user sayings
var sendingInfo = []    
class Email extends React.Component {
    constructor() {
        super();

        //Methods have to be binded to be able to use
        this.inboxFunction = this.inboxFunction.bind(this); //for listing mails that are received.
        this.sentFunction = this.sentFunction.bind(this);   //for listing mails that are sent.
        this.mailContent = this.mailContent.bind(this);     //for displaying the content of the selected mail
        this.sendMail = this.sendMail.bind(this);           //forum for send a mail
        this.handleSendSubmit = this.handleSendSubmit.bind(this);   //For handling inputs to send a mail
        this.handleChange = this.handleChange.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleEnd = this.handleEnd.bind(this);
        this.handleStart = this.handleStart.bind(this);
        this.get_emails = this.get_emails.bind(this);
        this.get_emails_sent = this.get_emails_sent.bind(this);

        this.state = {

            InboxMails: [],     //Keeps all Inbox mails
            SentMails: [],      //Keeps all Sent mails
            //initial mails list div 
            mailsContent: <tr ><td colSpan="2" id="noselected_div">   
                No Folder selected.
            </td></tr>,

            //initial mail body div 
            mailBody: <div className="noselected_div">
                No Mail selected.
            </div>,

            mail_list_header1: "",  //Mails list table header can be changed according to sent or received mail (To/From)
            mail_list_header2: "",  //Holds "Subject" header

            email_to_send: "",  //this states are for saving sending mail info
            subject_to_send: "",
            message_to_send: "",

            utterText: " To Send Email, please say Send Email. To Listen Email, say Listen. and To Exit, say Logout",
            initial: true,
            sendEmail: false,
            inboxEmail: false,
            sentEmail: false,

        };
    }

    //This function converts the text to speech
    text2speech = (text) => {
        synth.cancel()
        var utterThis = new SpeechSynthesisUtterance(text);
        synth.speak(utterThis);
    }

    //when the page is loaded, mails are received
    componentDidMount() {
        this.get_emails();
        this.get_emails_sent();
        document.addEventListener('keypress', this.handleClick)
        
        // Moved initial speech here to prevent loop
        if (this.state.initial === true) {
            this.setState({
                initial: false
            })
            this.text2speech("Login successful")
            this.text2speech("To Listen to menu, please hit the spacebar")
        } 
    }

    componentWillUnmount() {
        synth.cancel()
        document.removeEventListener('keypress', this.handleClick)
    }

    //This function is for receiving inbox emails from backend
    get_emails() {
        Axios.post("/email/fetch_emails", {"search": "INBOX"}).then((req) => {
            if (req.data.code === SUCCESS){
                this.setState({
                    InboxMails: req.data.data
                })
            }
        })
    }

    //This function is for receiving sent emails from backend
    get_emails_sent() {
        Axios.post("/email/fetch_emails", {"search": "SENT"}).then((req) => {
            if (req.data.code === SUCCESS){
                this.setState({
                    SentMails: req.data.data
                })
            }
        })
    }

    //This function shows the inbox mails on the mails list section
    inboxFunction() {
        //This function is for listing mails that are received.
        const list = this.state.InboxMails.map((item, index) => 
     
            <tr key={index} onClick={() => this.mailContent(item, 0)}>
                <td>{item.target}</td>
                <td>{item.subject}</td>
            </tr>
            
        );
        
        this.setState({
            mailsContent: list,
            mail_list_header1: "From",
            mail_list_header2: "Subject"
        });

    }

    //This function shows the sent mails on the mails list section
    sentFunction() {

        //This function is for listing mails that are sent.

        const list = this.state.SentMails.map((item, index) =>

            <tr key={index} onClick={() => this.mailContent(item, 1)}>
                <td>{item.target}</td>
                <td>{item.subject}</td>
            </tr>

        );

        this.setState({
            mailsContent: list,
            mail_list_header1: "To",
            mail_list_header2: "Subject"
        });

    }

    //This function is for displaying the content of the selected mail
    mailContent(item, id) {

        var from_to = "From: "  //If a received mail is wanted to display, it changes the header of the table
        var address = item.target
        if (id === 1) {
            from_to = "To: "    //If a sent mail is wanted to display
            address = item.target
        }
            
        const content =
            <div className="mailbody_div">
                <table>
                    <tbody>
                    <tr>
                        <td><h5>{from_to} </h5></td>
                        <td> <h6>{address}</h6></td>
                    </tr>

                    <tr>
                        <td><h5>Subject:  </h5></td>
                        <td> <h6>{item.subject}</h6></td>
                    </tr> 
                    </tbody>
                </table>

                <hr size="10"/>
                <p>  {item.content}</p>
            </div>

        this.setState({
            mailBody: content
        });

    }

    //This function changes the mail content div to be able to send a mail, it gives a form: "mail to send", "subject to send" and "message to send"
    sendMail() {

        this.setState({
            mailBody: 
       <form className="form-horizontal" action="#forms" onSubmit={this.handleSendSubmit}>
            <div className="form-group">
            <div className="col-3 col-sm-12">
                <label className="form-label" htmlFor="input-example-4"><h5>To: </h5></label>
            </div>
            <div className="col-9 col-sm-12">
                            <input className="form-input" id="address"
                                type="email"
                                placeholder="Email"
                                name="email_to_send"
                                onChange={this.handleChange}
                            />
            </div>
            </div>
            <div className="form-group">
            <div className="col-3 col-sm-12">
                <label className="form-label" htmlFor="input-example-5"><h5>Subject: </h5></label>
            </div>
            <div className="col-9 col-sm-12">
                            <input className="form-input" id="subject"
                                type="subject"
                                placeholder="Subject"
                                name="subject_to_send"
                                onChange={this.handleChange}/>
            </div>
            </div>
            
            <div className="form-group">
            <div className="col-3 col-sm-12">
                <label className="form-label" htmlFor="input-example-6"><h5>Message: </h5></label>
            </div>
            <div className="col-9 col-sm-12">
                            <textarea className="form-input" id="message"
                                placeholder="Textarea"
                                rows="3"
                                name="message_to_send"
                                onChange={this.handleChange}></textarea>
            </div>
            </div>

             <div className="form-group">
                <div className="btn-group btn-group-block">
                    <button className="btn btn-lg" id= "sendemail_button" type="submit">Send Email</button>
                </div>
            </div>
            
        </form>

        });

        
    }

   //This function is for exit from the email page
    handleLogout(e){
        if (e) {
            e.preventDefault();
        }
        
        // 1. Send the logout request
        Axios.get("/auth/logout").then((req) => {
            
            // 2. Wait for the server to say "Success"
            if (req.data.code === SUCCESS || req.data.detail === "Success") {
                this.text2speech("Log out successful");
                
                // 3. Clear all stored voice data so it doesn't carry over
                allText = [];
                sendingInfo = [];

                // 4. NOW we tell App.js to switch screens
                this.props.ask_auth(); 
            } else {
                alert(req.data.detail);
                // If it fails, force a check anyway, just in case
                this.props.ask_auth();
            }
        }).catch((err) => {
            console.log(err);
            // Even if there is an error, try to switch screens
            this.props.ask_auth();
        });
    }

    //For handling inputs(mail to send, subject and message) from sending mail menu
    handleChange(e) {
        this.setState({
            [e.target.name]: e.target.value
        });
   
    }

    handleSendSubmit(e) {
        if (e) e.preventDefault();
        
        Axios.post("/email/send_email", {
            "subject": this.state.subject_to_send,
            "to": this.state.email_to_send, 
            "content": this.state.message_to_send
        }).then((req) => {
            if (req.data.code === SUCCESS) {
                // --- FIX: EMPTY THE ARRAYS HERE ---
                sendingInfo = [];
                allText = [];
                // ----------------------------------
                
                // --- FIX: UNCOMMENT ALERT ---
                alert(req.data.detail); 

                // --- FIX: MANUALLY CLEAR INPUT FIELDS ---
                try {
                    document.getElementById("address").value = "";
                    document.getElementById("subject").value = "";
                    document.getElementById("message").value = "";
                } catch(e) { console.log("Could not clear fields"); }
                
                this.setState({
                    email_to_send: "",
                    message_to_send: "",
                    subject_to_send: ""
                });
            } else {
                alert(req.data.detail);
            }
        }).catch((err) => {
            console.log("SEND ERROR:", err);
            alert("Email failed to send. Check server logs.");
        });
    }

    //When the user is pressed the space, the voice assistant starts to inform about the options
    handleClick(e) {
        if (e.keyCode === 32) {
            this.text2speech(this.state.utterText)
        }
    }

    //This function starts the speech to text process
    handleStart() {
        this.setState({
            listening: true
        })
        synth.cancel(); 
    }

   //This function ends the speech to text process and speech will be saved
    handleEnd(err, text) {
        if (err || !text) {
            this.setState({ listening: false });
            return;
        }

        // Clean the command once (lowercase, remove extra spaces)
        let command = text.toLowerCase().trim();
        console.log("Command Heard:", command);

        this.setState({
            text: text,
            listening: false
        });

        // ==============================
        // 1. GLOBAL COMMANDS (Work Everywhere)
        // ==============================

        // LOGOUT: Works anytime, anywhere
        if (command === "logout" || command === "log out") {
            console.log("Triggering Logout...");
            this.handleLogout(null);
            return; 
        }

        // MENU: Immediately returns to the start
        if (command === "menu" || command === "main menu") {
            this.setState({ 
                inboxEmail: false, 
                sentEmail: false, 
                sendEmail: false,
                text: ""
            });
            sendingInfo = []; 
            allText = [];
            this.text2speech("Main Menu. You can say Send Email, Listen Email, or Logout.");
            return;
        }

        // ==============================
        // 2. SPECIFIC MODES
        // ==============================

        // --- INBOX MODE ---
        if (this.state.inboxEmail === true) {
            if (command === "restart") {
                let speech = "You have " + this.state.InboxMails.length + " emails.";
                this.state.InboxMails.forEach((item) => {
                    speech = speech + "! . ! From " + item.target + "! . ! Subject " + item.subject;
                });
                this.text2speech(speech + "! . ! Say the index number to open an email.");
            }
            else if (!isNaN(command)) { 
                let mail = this.state.InboxMails[parseInt(command) - 1];
                if(mail) {
                    this.mailContent(mail, 0);
                    this.text2speech("From: " + mail.target + "! . ! Subject:" + mail.subject + "! . ! Content:" + mail.content);
                } else {
                    this.text2speech("Email number " + command + " not found.");
                }
            } 
            else {
                this.text2speech("I didn't understand. Say an email number, or say Menu.");
            }
        }

        // --- SENT MODE ---
        else if (this.state.sentEmail === true) {
            if (command === "restart") {
                let speech = "You have " + this.state.SentMails.length + " emails.";
                this.state.SentMails.forEach((item) => {
                    speech = speech + "! . ! To " + item.target + "! . ! Subject " + item.subject;
                });
                this.text2speech(speech + "! . ! Say the index number to open an email.");
            }
            else if (!isNaN(command)) {
                let mail = this.state.SentMails[parseInt(command) - 1];
                if(mail) {
                    this.mailContent(mail, 0);
                    this.text2speech("To: " + mail.target + "! . ! Subject:" + mail.subject + "! . ! Content:" + mail.content);
                } else {
                    this.text2speech("Email number " + command + " not found.");
                }
            }
            else {
                this.text2speech("I didn't understand. Say an email number, or say Menu.");
            }
        }

        // --- SENDING EMAIL MODE ---
        else if (this.state.sendEmail === true) {
            sendingInfo.push(text);

            if (sendingInfo[sendingInfo.length - 1].toLowerCase() === "send") {
                
                let rawEmail = sendingInfo[0].toLowerCase();
                let fixedEmail = rawEmail
                    .replace(/at the rate/g, "@")
                    .replace(/ at /g, "@")
                    .replace(/ /g, ""); 

                sendingInfo[0] = fixedEmail; 

                this.setState({
                    email_to_send: sendingInfo[0],
                    subject_to_send: sendingInfo[1].toLowerCase(),
                    message_to_send: sendingInfo[2].toLowerCase(),
                });

                document.getElementById("address").value = this.state.email_to_send;
                document.getElementById("subject").value = this.state.subject_to_send;
                document.getElementById("message").value = this.state.message_to_send;

                this.text2speech("I have: To " + this.state.email_to_send + ", Subject " + this.state.subject_to_send + ". Say Correct to send, or Restart to try again.");
            }
            
            else if (command === "restart") {
                sendingInfo = [];
                this.text2speech("Okay, starting over. Say Address, then Subject, then Message.");
            }
            else if (command === "correct") {
                sendingInfo = [];
                this.handleSendSubmit(null);
                this.setState({ email_to_send: "", subject_to_send: "", message_to_send: "" });
                this.text2speech("Email sent successfully.");
            }
        }

        // ==============================
        // 3. MAIN MENU (Entry Points)
        // ==============================
        else {
            // FIX: Use .includes() so "Listen Email" works even if you say extra words
            if (command.includes("listen")) {
                this.text2speech("To hear received mails, say Inbox. To hear sent mails, say Sent.");
            }
            
            else if (command.includes("send email") || command.includes("compose")) {
                this.sendMail();
                this.text2speech("Say the Address, then Subject, then Message. Then say Send.");
                this.setState({ sendEmail: true, sentEmail: false, inboxEmail: false });
                sendingInfo = []; 
            }

            // --- CRASH FIX HERE: Use 'command' instead of allText array ---
            else if (command.replace(/ /g, "") === "sendemail") {
                this.sendMail();
                this.text2speech(`Please say the address, subject, and message. Then say send.`);
                sendingInfo = []; 
                this.setState({ sendEmail: true, sentEmail: false, inboxEmail: false });
                allText = [];
            }

            else if (command === "inbox") {
                this.inboxFunction();
                let speech = "You have " + this.state.InboxMails.length + " emails.";
                this.state.InboxMails.forEach((item) => {
                    speech = speech + "! . ! From " + item.target + "! . ! Subject " + item.subject;
                });
                this.text2speech(speech + "! . ! Say the email number to open it.");
                this.setState({ sendEmail: false, sentEmail: false, inboxEmail: true });
            }

            else if (command === "sent") {
                this.sentFunction();
                let speech = "You have " + this.state.SentMails.length + " emails.";
                this.state.SentMails.forEach((item) => {
                    speech = speech + "! . ! To " + item.target + "! . ! Subject " + item.subject;
                });
                this.text2speech(speech + "! . ! Say the email number to open it.");
                this.setState({ sendEmail: false, sentEmail: true, inboxEmail: false });
            }

            else {
                this.text2speech("I didn't catch that. Say Send Email, Listen, or Logout.");
            }
        }
    }
    render() {
        
      return (
        
          //Layout: "main div=> app_div(has all subdivs)", "header div", "menu div(left side)", "mails list div" and "mail content div"
          <div className="flex-centered">
              <Speech2Text onStart={this.handleStart} onEnd={this.handleEnd} />
              <Spell2Text onStart={this.handleStart} onEnd={this.handleEnd} />
              <div className="app_div">

                  <div className="header_section">
                      <p className="header_title">A Voice Based Email System</p>
                  </div>

                  <div className="menu_div">

                          <ul className="menu">
                              <li className="menu-item">
                                  <div className="tile tile-centered">
                                              <div className="tile-content">Menu</div>
                                   </div>
                              </li>
                               <li className="divider"></li>
                          <li className="menu-item" onClick={this.sendMail}><a href=" #top">Send Email</a>     
                                </li>
                                <li  className="menu-item">
                                    <a href="#top">Listen Email</a>
                                </li> 
                          <li className="menu-item"><a href="#top" onClick={this.handleLogout}>Logout</a>
                                </li> 
                          </ul>

                      <div className="mailbox_div">
                          <h4>Folders</h4>
                          <ul className="mailboxitem_div">

                              <li className="item_div" key={0}>

                                  <button className="btn badge" data-badge={this.state.InboxMails.length} onClick={this.inboxFunction}>
                                      Inbox
                                   </button>

                              </li>

                              <li className="item_div" key={1}>

                                  <button className="btn badge" data-badge={this.state.SentMails.length} onClick={this.sentFunction}>
                                      Sent
                                   </button>

                              </li>
                          </ul>

                      </div>

                   </div>

                  <div className="mails_div">
                      <table className="email-list table table-striped table-condensed">
                          <thead>
                              <tr>
                                  <th width="70%">{this.state.mail_list_header1}</th>
                                  <th width="30%">{this.state.mail_list_header2}</th>
                                  
                              </tr>
                          </thead>
                          <tbody>
                              {this.state.mailsContent}
                          </tbody>
                      </table>
                      
                  </div>

                  <div className="mailcontent_div">
                      {this.state.mailBody}
                  </div>

              </div>
           

          </div>
      )
  }
}

export default Email;