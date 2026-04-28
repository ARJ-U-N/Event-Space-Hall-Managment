// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// 1. Load env vars only in development (Vercel handles production envs natively)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// 2. Connect to database
connectDB();

// 3. Initialize the app BEFORE using middleware or routes
const app = express();

// 4. The CORS VIP List (Trusting your specific frontend URLs)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://event-space-hall-managment-3xpc.vercel.app', // Your frontend preview URL
  'https://event-space-hall-managment.vercel.app',      // Your backend production URL
  'http://localhost:5000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log("Blocked by CORS: ", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// 5. Google OAuth Fix: Cross-Origin-Opener-Policy
// This allows the Google Sign-in popup to communicate back to your app securely.
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// 6. Global Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 7. Welcome Route (Prevents 404 when visiting the main backend URL)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Event Space Hall Management API!',
    status: 'Operational'
  });
});

// 8. API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/halls', require('./routes/halls'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/superadmin', require('./routes/superadmin'));

// 9. Health check endpoint (Used to verify deployment status)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Event Space API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 10. Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 11. 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// 12. Only start listening if NOT in production (Vercel handles execution in prod)
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => {
      process.exit(1);
    });
  });
}

// 13. EXPORT FOR VERCEL: Crucial for serverless deployment
module.exports = app;