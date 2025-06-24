const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');
const app = express();
const port = 4000;

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();

// Middleware to log IP address for each request
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const timestamp = new Date().toISOString();

    const logData = {
        ip: ip,
        timestamp: timestamp
    };

    // Save to local file
    const logMessage = `IP: ${ip} - Date: ${timestamp}\n`;
    fs.appendFile('ip_log.txt', logMessage, (err) => {
        if (err) {
            console.error('Error logging IP locally:', err);
        }
    });

    // Save to Firebase Firestore
    db.collection('ip_logs').add(logData)
        .then(() => {
            console.log(`Logged IP to Firebase: ${ip}`);
        })
        .catch((error) => {
            console.error('Error logging to Firebase:', error);
        });

    next();
});

// Serve static files
app.use(express.static('public'));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
