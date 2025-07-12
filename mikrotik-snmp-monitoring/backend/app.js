const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { initializeCollectors, cleanupCollectors } = require('./controllers/snmpExporterController');

// Load environment variables
dotenv.config();

// Connect to database with explicit error handling
console.log('Connecting to MongoDB database...');
connectDB()
  .then(() => {
    console.log('Database connection established successfully');
  })
  .catch(err => {
    console.error('Failed to connect to the database:', err.message);
    console.error('The server will start, but database operations may fail');
  });

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Remove any undefined values
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/monitoring', require('./routes/monitoring'));
app.use('/api/snmp-exporter', require('./routes/snmpExporter'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MikroTik SNMP Monitoring API is running',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to MikroTik SNMP Monitoring API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/api/health`);
  
  // Initialize SNMP collectors with retry logic
  console.log('Initializing SNMP collectors with 5 second delay to ensure database connection is stable...');
  
  // Delay the initialization to give the database connection time to stabilize
  setTimeout(() => {
    initializeCollectors()
      .then(() => {
        console.log('SNMP collectors initialized successfully');
      })
      .catch(error => {
        console.error('Failed to initialize SNMP collectors:', error.message);
        console.log('The server will continue running, but automatic SNMP collection may not work properly.');
      });
  }, 5000); // 5 seconds delay
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  // Clean up SNMP collectors
  cleanupCollectors();
  
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
