const express = require('express');
const cors = require('cors');
const { env, validateConfig } = require('./config');
const routes = require('./src/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorMiddleware');

// Validate configuration
validateConfig();

const app = express();

// ==================== Middleware configuration ====================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file service
app.use(express.static('public'));

// Request log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ==================== Route configuration ====================

// API route
app.use('/api', routes);

// Root path redirect to API information
app.get('/', (req, res) => {
  res.redirect('/api/info');
});

// ==================== Error handling ====================

// 404 handling
app.use(notFoundHandler);

// Global error handling
app.use(errorHandler);

// ==================== Server start ====================

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log('Rice traceability system started successfully!');
  console.log(`Server address: http://localhost:${PORT}`);
  console.log(`API information: http://localhost:${PORT}/api/info`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Frontend interface: http://localhost:${PORT}/`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log('=' .repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;