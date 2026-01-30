const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
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
  
  // Call details
  callType: {
    type: String,
    enum: ['INCOMING', 'OUTGOING', 'MISSED', 'REJECTED'],
    required: true
  },
  
  // Contact info
  contactName: String,
  phoneNumber: {
    type: String,
    required: true
  },
  
  // Call duration (in seconds)
  duration: {
    type: Number,
    default: 0
  },
  
  // Call timestamps
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  
  // Recording
  isRecorded: {
    type: Boolean,
    default: false
  },
  recordingUrl: String,
  recordingPath: String,
  recordingSize: Number, // bytes
  recordingDuration: Number, // seconds
  
  // Call status
  status: {
    type: String,
    enum: ['COMPLETED', 'MISSED', 'REJECTED', 'ONGOING'],
    default: 'COMPLETED'
  },
  
  // Additional info
  simSlot: {
    type: Number,
    default: 0
  },
  
  // Is deleted
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
callSchema.index({ deviceId: 1, createdAt: -1 });
callSchema.index({ parentId: 1, createdAt: -1 });
callSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('Call', callSchema);
