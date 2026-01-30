const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  // Device identification
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  deviceName: {
    type: String,
    required: true
  },
  deviceModel: String,
  deviceManufacturer: String,
  androidVersion: String,
  appVersion: String,
  
  // Owner reference
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Device info
  phoneNumber: String,
  imei: String,
  simOperator: String,
  
  // Status
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  batteryLevel: {
    type: Number,
    default: 100
  },
  isCharging: {
    type: Boolean,
    default: false
  },
  networkType: {
    type: String,
    enum: ['WIFI', '4G', '5G', '3G', '2G', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  signalStrength: Number,
  
  // Location
  lastLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    address: String,
    timestamp: Date
  },
  
  // Stealth mode
  stealthMode: {
    type: Boolean,
    default: true
  },
  pinCode: {
    type: String,
    default: '1234'
  },
  
  // Permissions
  permissions: {
    callRecording: { type: Boolean, default: false },
    location: { type: Boolean, default: false },
    camera: { type: Boolean, default: false },
    microphone: { type: Boolean, default: false },
    contacts: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    storage: { type: Boolean, default: false },
    overlay: { type: Boolean, default: false },
    accessibility: { type: Boolean, default: false }
  },
  
  // Monitoring settings
  settings: {
    callRecording: { type: Boolean, default: true },
    smsTracking: { type: Boolean, default: true },
    locationTracking: { type: Boolean, default: true },
    socialTracking: { type: Boolean, default: true },
    browserTracking: { type: Boolean, default: true },
    photoSync: { type: Boolean, default: true },
    screenRecording: { type: Boolean, default: false },
    surroundingsRecording: { type: Boolean, default: false },
    trackingInterval: { type: Number, default: 30000 } // 30 seconds
  },
  
  // Restrictions
  restrictions: {
    blockedApps: [String],
    blockedNumbers: [String],
    blockedWebsites: [String],
    screenTimeLimit: Number, // minutes per day
    bedtimeStart: String, // HH:mm format
    bedtimeEnd: String,
    schoolMode: {
      enabled: { type: Boolean, default: false },
      startTime: String,
      endTime: String
    }
  },
  
  // Safe zones
  safeZones: [{
    name: String,
    latitude: Number,
    longitude: Number,
    radius: Number, // meters
    isActive: { type: Boolean, default: true }
  }],
  
  // Device is active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // FCM token for push notifications
  fcmToken: String,
  
  // Socket ID for real-time communication
  socketId: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp
deviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
deviceSchema.index({ parentId: 1, isActive: 1 });
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('Device', deviceSchema);
