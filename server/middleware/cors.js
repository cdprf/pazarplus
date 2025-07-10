const cors = require('cors');
const { app: appConfig } = require('../config');

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {return callback(null, true);}

    const allowedOrigins = Array.isArray(appConfig.corsOrigin)
      ? appConfig.corsOrigin
      : [appConfig.corsOrigin];

    // Add your local IP address for external device access
    const networkOrigins = [
      'http://192.168.1.105:3000', // Your machine's IP for React dev server
      'http://localhost:3000', // Keep localhost for local development
      'http://127.0.0.1:3000' // Alternative localhost
    ];

    const allAllowedOrigins = [...allowedOrigins, ...networkOrigins];

    if (allAllowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = cors(corsOptions);
