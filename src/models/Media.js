const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
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
  
  // Media type
  mediaType: {
    type: String,
    enum: ['PHOTO', 'VIDEO', 'AUDIO', 'DOCUMENT'],
    required: true
  },
  
  // Source
  source: {
    type: String,
    enum: ['CAMERA', 'SCREENSHOT', 'DOWNLOAD', 'WHATSAPP', 'OTHER'],
    default: 'OTHER'
  },
  
  // Camera info (if photo/video from camera)
  cameraInfo: {
    isFrontCamera: Boolean,
    flashOn: Boolean,
    resolution: String
  },
  
  // File info
  fileName: {
    type: String,
    required: true
  },
  originalPath: String,
  
  // Storage
  url: String,
  thumbnailUrl: String,
  path: String,
  thumbnailPath: String,
  
  // File size
  fileSize: {
    type: Number,
    required: true
  },
  
  // MIME type
  mimeType: String,
  
  // Dimensions (for images/videos)
  width: Number,
  height: Number,
  
  // Duration (for videos/audio)
  duration: Number, // seconds
  
  // Timestamp when media was created on device
  timestamp: {
    type: Date,
    required: true
  },
  
  // Location where media was captured
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  
  // Metadata
  metadata: {
    make: String,
    model: String,
    software: String,
    dateTime: Date,
    gpsLatitude: Number,
    gpsLongitude: Number
  },
  
  // Is synced to cloud
  isSynced: {
    type: Boolean,
    default: true
  },
  
  // Is deleted from device
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  // For remote capture (screenshot, camera)
  isRemoteCapture: {
    type: Boolean,
    default: false
  },
  remoteCommandId: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
mediaSchema.index({ deviceId: 1, timestamp: -1 });
mediaSchema.index({ parentId: 1, timestamp: -1 });
mediaSchema.index({ mediaType: 1 });
mediaSchema.index({ source: 1 });

module.exports = mongoose.model('Media', mediaSchema);
