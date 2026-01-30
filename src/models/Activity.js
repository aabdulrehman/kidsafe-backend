const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
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
  
  // Activity type
  activityType: {
    type: String,
    enum: [
      'APP_OPENED',
      'APP_CLOSED',
      'SCREEN_ON',
      'SCREEN_OFF',
      'SCREEN_UNLOCKED',
      'SCREEN_LOCKED',
      'CALL_STARTED',
      'CALL_ENDED',
      'SMS_RECEIVED',
      'SMS_SENT',
      'LOCATION_UPDATED',
      'BATTERY_LOW',
      'BATTERY_CHARGING',
      'BATTERY_FULL',
      'NETWORK_CHANGED',
      'SIM_CHANGED',
      'DEVICE_REBOOTED',
      'KEYBOARD_TYPED',
      'CLIPBOARD_COPIED',
      'NOTIFICATION_RECEIVED',
      'CONTACT_ADDED',
      'CONTACT_DELETED',
      'CALENDAR_EVENT',
      'BROWSER_VISIT',
      'FILE_DOWNLOADED',
      'FILE_DELETED',
      'PHOTO_CAPTURED',
      'VIDEO_RECORDED',
      'AUDIO_RECORDED',
      'REMOTE_COMMAND_RECEIVED',
      'REMOTE_COMMAND_EXECUTED',
      'SAFE_ZONE_ENTERED',
      'SAFE_ZONE_EXITED',
      'SCREEN_TIME_LIMIT_REACHED',
      'BLOCKED_APP_ATTEMPT',
      'BLOCKED_WEBSITE_ATTEMPT'
    ],
    required: true
  },
  
  // Activity title/summary
  title: {
    type: String,
    required: true
  },
  
  // Detailed description
  description: String,
  
  // Related app (if applicable)
  appName: String,
  appPackage: String,
  
  // Related data
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    required: true
  },
  
  // Severity level
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'ALERT', 'CRITICAL'],
    default: 'INFO'
  },
  
  // Is read by parent
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Should send notification
  sendNotification: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
activitySchema.index({ deviceId: 1, timestamp: -1 });
activitySchema.index({ parentId: 1, timestamp: -1 });
activitySchema.index({ activityType: 1 });
activitySchema.index({ severity: 1 });
activitySchema.index({ isRead: 1 });

module.exports = mongoose.model('Activity', activitySchema);
