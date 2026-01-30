/**
 * KidSafe+ Backend Server
 * Real-time Monitoring & Spy App API
 */

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/auth');
const deviceRoutes = require('./src/routes/devices');
const callRoutes = require('./src/routes/calls');
const messageRoutes = require('./src/routes/messages');
const locationRoutes = require('./src/routes/locations');
const mediaRoutes = require('./src/routes/media');
const socialRoutes = require('./src/routes/social');
const remoteRoutes = require('./src/routes/remote');
const dashboardRoutes = require('./src/routes/dashboard');

// Import socket handlers
const socketHandler = require('./src/services/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Global io instance
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests, please try again later'
});
app.use(limiter);

// CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kidsafe';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/remote', remoteRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'KidSafe+ API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      devices: '/api/devices',
      calls: '/api/calls',
      messages: '/api/messages',
      locations: '/api/locations',
      media: '/api/media',
      social: '/api/social',
      remote: '/api/remote',
      dashboard: '/api/dashboard'
    }
  });
});

// Socket.io connection handling
socketHandler(io);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 KidSafe+ Backend Server                             ║
║   Running on port: ${PORT}                                ║
║                                                          ║
║   API URL: http://localhost:${PORT}/api                   ║
║   Health:  http://localhost:${PORT}/api/health            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
