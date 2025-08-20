// src/js/auth.js
import { firebaseConfig } from './utils/firebase-config.js';

// --- UI Elements ---
let loginContainer = null;

function createLoginUI() {
    if (document.getElementById('login-container')) return;

    const container = document.createElement('div');
    container.id = 'login-container';

    const button = document.createElement('button');
    button.id = 'google-signin-btn';
    button.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
            <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29H0.957275C0.347727 8.51727 0 10.3636 0 12C0 13.6364 0.347727 15.4827 0.957275 16.71L3.96409 14.29Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
        </svg>
        <span>Sign in with Google</span>
    `;
    button.addEventListener('click', signInWithGoogle);

    container.appendChild(button);
    document.body.appendChild(container);
    loginContainer = container;
}

function showLoginUI() {
    if (loginContainer) loginContainer.style.display = 'flex';
}

function hideLoginUI() {
    if (loginContainer) loginContainer.style.display = 'none';
}

// --- Firebase Initialization & Auth Logic ---

function initializeFirebase() {
    // Firebase configuration is now imported from a separate file
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(error => {
        console.error("Sign-in error", error);
    });
}

export function signOut() {
    firebase.auth().signOut();
}

export function initAuth(onLogin, onLogout) {
    createLoginUI();
    initializeFirebase();

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            hideLoginUI();
            onLogin(user);
        } else {
            showLoginUI();
            onLogout();
        }
    });
}
