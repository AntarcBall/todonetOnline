# TodoNet Online

A web-based interactive network visualization and management tool.

## 🔒 Security Notice

This repository contains configuration files and code that require proper setup before deployment:

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Gemini AI API Key (obtain from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Service Account (for server-side operations)
FIREBASE_SERVICE_ACCOUNT_JSON='{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "your-client-cert-url"
}'

# For Google Cloud Platform deployment
GCP_PROJECT=your-gcp-project-id
SECRET_ID=your-secret-manager-secret-id
```

### Firebase Configuration

Update the Firebase configuration in `src/js/utils/firebase-config.js` with your project's values:

1. Go to Firebase Console → Project Settings → General
2. Scroll down to "Your apps" section
3. Click on the web app or create a new one
4. Copy the configuration values

### Security Considerations

- **Never commit** actual API keys or service account files to version control
- The `.env` file is already included in `.gitignore`
- Firebase web configuration values are safe to be public (they identify your project but don't grant access)
- Server-side service account keys should be kept secure and never exposed publicly

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or later)
- Firebase project with Authentication and Firestore enabled
- Google AI Studio account for Gemini API access

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables (see Security Notice above)
4. Update Firebase configuration in `src/js/utils/firebase-config.js`
5. Start the development server:
   ```bash
   node server.js
   ```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication with Google provider
3. Enable Firestore Database
4. Create a service account for server-side operations
5. Set up Firebase Security Rules for your collections

### Deployment

For production deployment:

1. Use environment variables or Google Secret Manager for sensitive data
2. Configure your hosting platform's environment variables
3. Ensure Firebase Security Rules are properly configured
4. Test authentication and database operations

## 📁 Project Structure

```
├── src/
│   ├── js/
│   │   ├── app/          # Application logic
│   │   ├── ui/           # User interface components
│   │   ├── utils/        # Utility functions and configuration
│   │   ├── auth.js       # Authentication handling
│   │   └── main.js       # Main application entry point
│   ├── css/              # Stylesheets
│   ├── assets/           # Static assets
│   └── index.html        # Main HTML file
├── server.js             # Express server
├── package.json          # Dependencies
└── README.md            # This file
```

## 🔧 Features

- Interactive network visualization
- Real-time collaboration
- Firebase Authentication
- Cloud Firestore integration
- AI-powered features with Gemini API

## 📝 License

[Add your license information here]

## 🤝 Contributing

[Add contribution guidelines here]

## ⚠️ Disclaimer

This project is for educational/demonstration purposes. Ensure proper security measures before deploying to production.
