const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// 1. Load env vars only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// 2. Connect to database
connectDB();

// --- THIS LINE WAS MISSING/MISPLACED ---
const app = express();

// 3. The CORS VIP List
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://event-space-hall-managment-3xpc.vercel.app', // Your frontend preview URL
  'https://event-space-hall-managment.vercel.app',      // Your backend URL
  'http://localhost:5000', 'http://localhost:3001', 'http://localhost:3002',
  'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'
];

// 4. The Bouncer Logic
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// 5. Welcome route for the root URL (Fixes the 404 you saw earlier)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Event Space Hall Management API!'
  });
});

// 6. Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 7. Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/halls', require('./routes/halls'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/superadmin', require('./routes/superadmin'));

// 8. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Event Space API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 9. Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 10. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// 11. Only start server if NOT in production (Vercel handles this)
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

// 12. Export for Vercel serverless
module.exports = app;