import React from 'react';
import './welcome.css';
import Axios from 'axios';
import { SUCCESS } from './error_codes';
import Speech2Text from "./s2t.js";
import Spell2Text from "./spell2text.js"

var synth = window.speechSynthesis  //for text to speech
var allText = []        //Keeps the user sayings

class Welcome extends React.Component {
    constructor() {
        super();
        this.state = {
            email: "",
            password: "",
            username: "",
            email_for_registration: "",
            password_for_registration: "",
            initial: true,
            text: "",
            listening: false,
            count: 0
        }

        //Methods have to be binded to be able to use
        this.handleChange = this.handleChange.bind(this);
        this.handleLoginSubmit = this.handleLoginSubmit.bind(this);
        this.handleSignSubmit = this.handleSignSubmit.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleEnd = this.handleEnd.bind(this);
        this.handleStart = this.handleStart.bind(this);
    }

    //Input values are kept in the local states
    handleChange(e) {
        this.setState({
            [e.target.name]: e.target.value
        });
    }

    //This function converts the text to speech
    text2speech(text) {
        synth.cancel()
        var utterThis = new SpeechSynthesisUtterance(text);
        synth.speak(utterThis);
    }

    //When login button is pressed, this method is called. It sends the login info to backend
    handleLoginSubmit(e) {
        if (e) {
            e.preventDefault();
        }
        Axios.post("/auth/login", { "address": this.state.email, "password": this.state.password }).then((req) => {
            if (req.data.code === SUCCESS) {
                allText = [];
                this.props.ask_auth()
            } else {
                alert(req.data.detail)
                this.text2speech(req.data.detail)

                //States will be emptied
                this.setState({
                    email: "",
                    password: "",
                    email_for_registration: "",
                    username: "",
                    password_for_registration: ""

                })

                allText = []
            }
        })
    }

    //When sign up button is pressed, this method is called. It sends the sign up info to backend
    handleSignSubmit(e) {
        if (e) {
            e.preventDefault();
        }
        Axios.post("/auth/sign_in", { "address": this.state.email_for_registration, "username": this.state.username, "password": this.state.password_for_registration }).then((req) => {
            if (req.data.code === SUCCESS) {
                this.props.ask_auth()
            } else {
                alert(req.data.detail)
                this.text2speech(req.data.detail)

                //States will be emptied
                this.setState({
                    email: "",
                    password: "",
                    email_for_registration: "",
                    username: "",
                    password_for_registration: ""
                })
                allText = []
            }
        })
    }

    //When user is pressed the space key, voice assistant starts to inform user about options
    handleClick(e) {
        //e.preventDefault();
        if (e.keyCode === 32) {
            this.text2speech(`To create a new account, please say "New account" and say your gmail address, username, and password respectively. OR
            To enter to your existing account, please say "log in", and say your gmail address and password. Then Say "Submit" for operation.
            Use the "Escape key", to start, and end your speech. You can say "restart" to start over.`)
        }
    }

    //when the page is loaded
    componentDidMount() {
        document.addEventListener('keypress', this.handleClick);
        // Moved the welcome message here to avoid infinite render loop
        if (this.state.initial === true) {
            this.setState({
                initial: false
            })
            this.text2speech("Welcome To The Voice Based Email System. Please hit the spacebar to listen voice assistant")
        }
    }

    componentWillUnmount() {
        synth.cancel()
        document.removeEventListener('keypress', this.handleClick)
    }

    //This function starts the speech to text process
    handleStart() {
        this.setState({
            listening: true
        })
        synth.cancel()
    }

    //This function ends the speech to text process and speech will be saved
//This function ends the speech to text process and speech will be saved
   //This function ends the speech to text process and speech will be saved
   handleEnd(err, text) {
        if (err || !text) {
            this.setState({ listening: false });
            return;
        }

        console.log("Heard:", text);

        if (text.toLowerCase().replace(/ /g, "") === "restart") {
            allText = [];
            this.setState({ listening: false });
            return;
        }

        this.setState({
            text: text,
            listening: false
        });

        allText.push(text);
        console.log("Current Conversation:", allText);

        // --- THE HACK: PASSWORD TRANSLATOR ---
        // This function checks if you said the "Magic Word" and swaps it for the real password
        const getRealPassword = (spokenWord) => {
            let cleanWord = spokenWord.toLowerCase().replace(/\s/g, "");
            
            // MAGIC PHRASE 1: "Security Code"
            if (cleanWord === "securitycode" || cleanWord === "accesscode") {
                return "gbnf ybnb idmq qoxa"; // <--- YOUR REAL GOOGLE APP PASSWORD
            }
            return cleanWord; // If you didn't say the magic word, use what you spoke
        };
        // -------------------------------------

        if (allText.length > 0 && allText[allText.length - 1].toLowerCase() === "submit") {

            // Fix Email format (at the rate -> @)
            if (allText[1]) {
                allText[1] = allText[1].toLowerCase()
                    .replace(/at the rate/g, "@")
                    .replace(/ at /g, "@")
                    .replace(/ /g, "");
            }

            // LOGIN LOGIC
            if (allText.length > 0 && allText[0].toLowerCase().replace(/\s/g, "") === "login") {
                if(allText.length >= 3) {
                     // Get the password (spoken or magic)
                     let finalPassword = getRealPassword(allText[2]);

                     this.setState({
                        email: allText[1],
                        password: finalPassword, // Use the translated password
                    });
                    this.handleLoginSubmit(null);
                } else {
                    this.text2speech("I heard Login, but I need email and password. Please restart.");
                }
            }
            
            // NEW ACCOUNT LOGIC
            else if (allText.length > 0 && allText[0].toLowerCase().replace(/\s/g, "") === "newaccount"){
                 if(allText.length >= 4) {
                    // Get the password (spoken or magic) - Index 3 is password here
                    let finalPassword = getRealPassword(allText[3]);

                    this.setState({
                        email_for_registration: allText[1],
                        username: allText[2].toLowerCase(),
                        password_for_registration: finalPassword, // Use the translated password
                    });
                    this.handleSignSubmit(null);
                 } else {
                     this.text2speech("I heard New Account, but I need email, username and password. Please restart.");
                 }
            }
        }
    }

    render() {
        return (

            <div className="page">

                <div className="logo"></div>
                <div className="header">
                    <h2>Welcome To The Voice Based Email System</h2>
                </div>

                <div className="content">
                    <div className="col-sm-8 main-section">


                        <Speech2Text onStart={this.handleStart} onEnd={this.handleEnd} />
                        <Spell2Text onStart={this.handleStart} onEnd={this.handleEnd} />


                        <form onSubmit={this.handleLoginSubmit}>
                            Email
                            <div className="form-group">
                                <input
                                    className="form-input"
                                    type="email" placeholder="Email"
                                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,14}$"
                                    name="email"
                                    onChange={this.handleChange}
                                    value={this.state.email}
                                    required
                                />
                            </div>
                            Password
                            <div className="form-group">
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder="Password"
                                    onChange={this.handleChange}
                                    value={this.state.password}
                                    name="password"
                                    required
                                />
                            </div>
                            <br />

                            <div className="form-group">
                                <div className="btn-group btn-group-block">
                                    <button className="btn btn-primary btn-block" type="submit" value="Submit">Login</button>
                                </div>
                            </div>
                        </form>

                        <br />
                        <div className="divider text-center" data-content="OR SIGN UP"></div>
                        <form onSubmit={this.handleSignSubmit}>
                            Email
                            <div className="form-group">
                                <input
                                    className="form-input"
                                    type="email"
                                    placeholder="Email"
                                    onChange={this.handleChange}
                                    value={this.state.registrationmail}
                                    name="email_for_registration"
                                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,14}$"
                                    required
                                />
                            </div>
                            Username
                            <div className="form-group">
                                <input
                                    className="form-input"
                                    type=""
                                    placeholder="Username"
                                    onChange={this.handleChange}
                                    value={this.state.username}
                                    name="username"
                                    required
                                />
                            </div>
                            Password
                            <div className="form-group">
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder="Password"
                                    onInput={this.handleChange}
                                    value={this.state.registrationpassword}
                                    name="password_for_registration"
                                    required
                                />
                            </div>

                            <br />
                            <div className="form-group">
                                <div className="btn-group btn-group-block">
                                    <button className="btn btn-primary btn-block" type="submit">Sign Up</button>
                                </div>
                            </div>
                        </form>
                    </div>

                </div>

            </div>
        )
    }
}

export default Welcome;