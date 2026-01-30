const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  // Reference
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Coordinates
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  
  // Accuracy
  accuracy: {
    type: Number,
    default: 0
  },
  
  // Altitude
  altitude: Number,
  
  // Speed (m/s)
  speed: Number,
  
  // Bearing/Direction
  bearing: Number,
  
  // Provider (GPS, Network, etc.)
  provider: {
    type: String,
    enum: ['GPS', 'NETWORK', 'FUSED', 'PASSIVE'],
    default: 'GPS'
  },
  
  // Address (reverse geocoded)
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    formattedAddress: String
  },
  
  // Timestamp when location was recorded
  timestamp: {
    type: Date,
    required: true
  },
  
  // Is this a significant location change
  isSignificant: {
    type: Boolean,
    default: false
  },
  
  // Distance from previous location (meters)
  distanceFromPrevious: Number,
  
  // Safe zone info
  inSafeZone: {
    type: Boolean,
    default: false
  },
  safeZoneName: String,
  
  // Battery level at time of location
  batteryLevel: Number,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries and geospatial
locationSchema.index({ deviceId: 1, timestamp: -1 });
locationSchema.index({ parentId: 1, timestamp: -1 });
locationSchema.index({ latitude: 1, longitude: 1 });

// 2dsphere index for geospatial queries
locationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Location', locationSchema);
