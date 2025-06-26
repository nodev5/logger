const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 4000;

// Load Firebase credentials
const serviceAccount = require(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(express.json()); // for parsing JSON request bodies

// IP logging middleware
app.use((req, res, next) => {
  const rawIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const ip = rawIP.split(',')[0].trim(); // Clean up multiple proxies
  const timestamp = new Date().toISOString();

  const logData = {
    ip,
    timestamp
  };

  // Save to local file
  const logMessage = `IP: ${ip} - Date: ${timestamp}\n`;
  fs.appendFile('ip_log.txt', logMessage, (err) => {
    if (err) {
      console.error('Error logging IP locally:', err);
    }
  });

  // Save to Firebase
  db.collection('ip_logs').add(logData)
    .then(() => {
      console.log(`Logged IP to Firebase: ${ip}`);
    })
    .catch((error) => {
      console.error('Error logging to Firebase:', error);
    });

  next();
});

// Route to receive precise or fallback location
app.post('/log-location', (req, res) => {
  const { latitude, longitude, fallback } = req.body;
  const timestamp = new Date().toISOString();

  const locationData = {
    timestamp,
    fallback: !!fallback
  };

  if (!fallback && latitude != null && longitude != null) {
    locationData.latitude = latitude;
    locationData.longitude = longitude;
  } else {
    locationData.note = 'Fallback used or location unavailable';
  }

  db.collection('precise_locations').add(locationData)
    .then(() => {
      console.log(fallback ? '📍 Fallback location logged' : '📍 Precise location logged');
      res.sendStatus(200);
    })
    .catch((error) => {
      console.error('❌ Error saving location:', error);
      res.sendStatus(500);
    });
});

// Serve static files
app.use(express.static('public'));

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
