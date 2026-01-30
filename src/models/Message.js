const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
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
  
  // Message source
  appName: {
    type: String,
    enum: ['SMS', 'MMS', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'SNAPCHAT', 'TELEGRAM', 'TIKTOK', 'VIBER', 'SKYPE', 'LINE', 'SIGNAL', 'OTHER'],
    required: true
  },
  
  // Message type
  messageType: {
    type: String,
    enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'STICKER'],
    default: 'TEXT'
  },
  
  // Direction
  direction: {
    type: String,
    enum: ['INCOMING', 'OUTGOING'],
    required: true
  },
  
  // Contact info
  contactName: String,
  phoneNumber: String,
  senderId: String, // For social media
  chatId: String, // Group/chat identifier
  
  // Message content
  content: {
    type: String,
    required: true
  },
  
  // Media attachments
  media: [{
    type: {
      type: String,
      enum: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']
    },
    url: String,
    path: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    thumbnail: String
  }],
  
  // Message timestamp
  timestamp: {
    type: Date,
    required: true
  },
  
  // Message status
  status: {
    type: String,
    enum: ['SENT', 'DELIVERED', 'READ', 'PENDING', 'FAILED'],
    default: 'DELIVERED'
  },
  
  // Is deleted from device
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  // Is group message
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: String,
  
  // Reply to
  replyToMessageId: String,
  
  // Location data (if shared)
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
messageSchema.index({ deviceId: 1, timestamp: -1 });
messageSchema.index({ parentId: 1, timestamp: -1 });
messageSchema.index({ appName: 1 });
messageSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('Message', messageSchema);
