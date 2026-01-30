const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
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
  
  // Contact ID from device
  contactId: String,
  
  // Name
  displayName: {
    type: String,
    required: true
  },
  firstName: String,
  lastName: String,
  
  // Phone numbers
  phoneNumbers: [{
    type: {
      type: String,
      enum: ['MOBILE', 'HOME', 'WORK', 'OTHER'],
      default: 'MOBILE'
    },
    number: String,
    isPrimary: { type: Boolean, default: false }
  }],
  
  // Emails
  emails: [{
    type: {
      type: String,
      enum: ['HOME', 'WORK', 'OTHER'],
      default: 'HOME'
    },
    email: String
  }],
  
  // Photo
  photoUrl: String,
  photoPath: String,
  
  // Organization
  organization: String,
  jobTitle: String,
  
  // Address
  addresses: [{
    type: {
      type: String,
      enum: ['HOME', 'WORK', 'OTHER'],
      default: 'HOME'
    },
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  }],
  
  // Birthday
  birthday: Date,
  
  // Notes
  notes: String,
  
  // Website
  website: String,
  
  // Social profiles
  socialProfiles: [{
    platform: String,
    username: String,
    url: String
  }],
  
  // Is favorite
  isFavorite: {
    type: Boolean,
    default: false
  },
  
  // Is blocked
  isBlocked: {
    type: Boolean,
    default: false
  },
  
  // Last contacted
  lastContacted: Date,
  
  // Sync timestamp
  syncedAt: {
    type: Date,
    default: Date.now
  },
  
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
contactSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
contactSchema.index({ deviceId: 1, displayName: 1 });
contactSchema.index({ parentId: 1 });
contactSchema.index({ 'phoneNumbers.number': 1 });

module.exports = mongoose.model('Contact', contactSchema);
