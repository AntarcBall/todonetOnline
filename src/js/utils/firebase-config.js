// src/js/utils/firebase-config.js

/**
 * Firebase configuration for the web app
 * These values are safe to expose publicly as they identify your Firebase project
 * but don't grant access to your data. Access is controlled by Firebase Security Rules.
 * 
 * For production deployment, you may want to load these from environment variables
 * or a separate config file that's not committed to version control.
 */

// Default development configuration (you should replace these with your actual values)
const defaultConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "your-api-key-here",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

// For client-side JavaScript, environment variables aren't directly available
// You'll need to inject these during build time or load from a config endpoint
export const firebaseConfig = {
    apiKey: "AIzaSyBLPpdK38nATM5aNQOwZ04UMevuk0Jv-zQ",
    authDomain: "todonet-ddd51.firebaseapp.com", 
    projectId: "todonet-ddd51",
    storageBucket: "todonet-ddd51.firebasestorage.app",
    messagingSenderId: "292508862182",
    appId: "1:292508862182:web:f955d1cbeb1eba843d1d27",
    measurementId: "G-29HBL9Z5NP"
};

// Note: These Firebase web config values are meant to be public
// They identify your Firebase project but don't grant access to your data
// Access control is managed through Firebase Security Rules
