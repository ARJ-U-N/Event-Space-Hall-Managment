// server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// 1. Load env vars only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// 2. Connect to database
connectDB();

// 3. Initialize the app
const app = express();

// 4. Flexible CORS Logic (The "Dynamic Bouncer")
const corsOptions = {
  origin: function (origin, callback) {
    // Allow local development
    const isLocal = !origin || origin.includes('localhost') || origin.includes('127.0.0.1');

    // Allow ANY Vercel URL that belongs to your project (Fixes the -3xpc / -3xqe issue)
    const isProjectVercel = origin && origin.includes('event-space-hall-managment');

    if (isLocal || isProjectVercel) {
      callback(null, true);
    } else {
      console.log("CORS Blocked Origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// 5. Google OAuth Security Fix (COOP)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// 6. Global Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 7. Welcome Route
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

// 9. Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Event Space API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// 10. Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 11. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// 12. Local server startup (Vercel ignores this)
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`Server running in development mode on port ${PORT}`);
  });

  process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

// 13. Export for Vercel
module.exports = app;