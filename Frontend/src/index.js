// 1. Process MUST be first
import * as process from 'process';
import Axios from 'axios';

// 2. React imports come second
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// 3. Assign process to window
window.process = process;

Axios.defaults.baseURL = process.env.NODE_ENV === 'production' 
  ? "https://YOUR-BACKEND-APP-NAME.onrender.com" 
  : "http://localhost:5000";

// 4. Render app
ReactDOM.render(<App />, document.getElementById('root'));