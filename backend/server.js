// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || '*'  // Changed: Use env variable
    : ['http://localhost:5000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/halls', require('./routes/halls'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/superadmin', require('./routes/superadmin'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Event Space API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Only start server if NOT in production (Vercel handles this)
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

// Export for Vercel serverless
module.exports = app;
