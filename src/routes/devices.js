const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { Device, User } = require('../models');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/devices
// @desc    Get all devices for logged in user
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const devices = await Device.find({ 
      parentId: req.userId,
      isActive: true 
    }).sort({ lastSeen: -1 });

    res.json({
      success: true,
      count: devices.length,
      data: { devices }
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/devices/:id
// @desc    Get single device details
// @access  Private
router.get('/:id', authenticate, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      parentId: req.userId
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.json({
      success: true,
      data: { device }
    });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/devices
// @desc    Register a new device (from Android app)
// @access  Public (with device authentication)
router.post('/', [
  body('deviceId').notEmpty(),
  body('deviceName').notEmpty(),
  body('parentId').isMongoId(),
  body('deviceModel').optional(),
  body('deviceManufacturer').optional(),
  body('androidVersion').optional(),
  body('appVersion').optional(),
  body('phoneNumber').optional(),
  body('imei').optional(),
  body('fcmToken').optional()
], async (req, res) => {
  try {
    const {
      deviceId,
      deviceName,
      parentId,
      deviceModel,
      deviceManufacturer,
      androidVersion,
      appVersion,
      phoneNumber,
      imei,
      fcmToken
    } = req.body;

    // Check if parent exists
    const parent = await User.findById(parentId);
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent user not found'
      });
    }

    // Check device limit
    const deviceCount = await Device.countDocuments({ 
      parentId,
      isActive: true 
    });

    if (deviceCount >= parent.subscription.maxDevices) {
      return res.status(403).json({
        success: false,
        message: 'Device limit reached. Please upgrade your subscription.'
      });
    }

    // Check if device already exists
    let device = await Device.findOne({ deviceId });
    
    if (device) {
      // Update existing device
      device.deviceName = deviceName;
      device.deviceModel = deviceModel;
      device.deviceManufacturer = deviceManufacturer;
      device.androidVersion = androidVersion;
      device.appVersion = appVersion;
      device.phoneNumber = phoneNumber;
      device.imei = imei;
      device.fcmToken = fcmToken;
      device.isOnline = true;
      device.lastSeen = new Date();
      device.isActive = true;
    } else {
      // Create new device
      device = new Device({
        deviceId,
        deviceName,
        parentId,
        deviceModel,
        deviceManufacturer,
        androidVersion,
        appVersion,
        phoneNumber,
        imei,
        fcmToken,
        isOnline: true,
        lastSeen: new Date()
      });
    }

    await device.save();

    res.status(201).json({
      success: true,
      message: device.isNew ? 'Device registered successfully' : 'Device updated successfully',
      data: { device }
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/devices/:id
// @desc    Update device settings
// @access  Private
router.put('/:id', authenticate, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const updates = {};
    
    // Allowed fields to update
    const allowedFields = [
      'deviceName', 'stealthMode', 'pinCode', 'settings', 
      'restrictions', 'permissions'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, parentId: req.userId },
      updates,
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Emit update to device via socket
    const io = req.app.get('io');
    if (device.socketId) {
      io.to(device.socketId).emit('settings_updated', updates);
    }

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: { device }
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/devices/:id
// @desc    Delete/unlink a device
// @access  Private
router.delete('/:id', authenticate, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, parentId: req.userId },
      { isActive: false },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Notify device to uninstall
    const io = req.app.get('io');
    if (device.socketId) {
      io.to(device.socketId).emit('device_unlinked');
    }

    res.json({
      success: true,
      message: 'Device unlinked successfully'
    });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/devices/:id/heartbeat
// @desc    Device heartbeat (from Android app)
// @access  Public
router.post('/:id/heartbeat', [
  param('id').isMongoId(),
  body('batteryLevel').optional().isNumeric(),
  body('isCharging').optional().isBoolean(),
  body('networkType').optional(),
  body('signalStrength').optional().isNumeric()
], async (req, res) => {
  try {
    const { batteryLevel, isCharging, networkType, signalStrength } = req.body;

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      {
        isOnline: true,
        lastSeen: new Date(),
        batteryLevel,
        isCharging,
        networkType,
        signalStrength
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.json({
      success: true,
      data: {
        settings: device.settings,
        restrictions: device.restrictions
      }
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/devices/:id/status
// @desc    Get device online status
// @access  Private
router.get('/:id/status', authenticate, async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      parentId: req.userId
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Check if device is online (last seen within 2 minutes)
    const isOnline = device.lastSeen && 
      (new Date() - new Date(device.lastSeen)) < 2 * 60 * 1000;

    res.json({
      success: true,
      data: {
        isOnline,
        lastSeen: device.lastSeen,
        batteryLevel: device.batteryLevel,
        isCharging: device.isCharging,
        networkType: device.networkType
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
