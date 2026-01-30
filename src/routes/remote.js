const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { Device, Media, Activity } = require('../models');
const { authenticate } = require('../middleware/auth');

// @route   POST /api/remote/:deviceId/command
// @desc    Send remote command to device
// @access  Private
router.post('/:deviceId/command', authenticate, [
  param('deviceId').isMongoId(),
  body('command').isIn(['TAKE_PICTURE', 'RECORD_SURROUNDINGS', 'START_ALARM', 'LOCK_SCREEN', 'SCREENSHOT', 'START_STREAM', 'STOP_STREAM', 'REMOTE_WIPE', 'GET_LOCATION']),
  body('params').optional().isObject()
], async (req, res) => {
  try {
    const { command, params = {} } = req.body;

    const device = await Device.findOne({
      _id: req.params.deviceId,
      parentId: req.userId
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Emit command to device via socket
    const io = req.app.get('io');
    
    if (!device.socketId) {
      return res.status(400).json({
        success: false,
        message: 'Device is offline'
      });
    }

    const commandData = {
      commandId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      command,
      params,
      timestamp: new Date()
    };

    io.to(device.socketId).emit('remote_command', commandData);

    // Log activity
    const activity = new Activity({
      deviceId: device._id,
      parentId: req.userId,
      activityType: 'REMOTE_COMMAND_SENT',
      title: `Remote command sent: ${command}`,
      description: `Command ${command} sent to device`,
      data: { command, params },
      timestamp: new Date()
    });
    await activity.save();

    res.json({
      success: true,
      message: 'Command sent successfully',
      data: { commandId: commandData.commandId }
    });
  } catch (error) {
    console.error('Send command error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/remote/:deviceId/response
// @desc    Receive response from device (from Android app)
// @access  Public
router.post('/:deviceId/response', [
  param('deviceId').notEmpty(),
  body('commandId').notEmpty(),
  body('status').isIn(['SUCCESS', 'FAILED', 'PENDING']),
  body('data').optional().isObject()
], async (req, res) => {
  try {
    const { commandId, status, data = {} } = req.body;

    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Emit response to parent dashboard
    const io = req.app.get('io');
    io.to(`parent_${device.parentId}`).emit('command_response', {
      commandId,
      status,
      data,
      deviceId: device._id
    });

    // Log activity
    const activity = new Activity({
      deviceId: device._id,
      parentId: device.parentId,
      activityType: 'REMOTE_COMMAND_EXECUTED',
      title: `Remote command ${status.toLowerCase()}`,
      description: `Command ${commandId} execution ${status.toLowerCase()}`,
      data: { commandId, status, data },
      timestamp: new Date(),
      severity: status === 'FAILED' ? 'WARNING' : 'INFO'
    });
    await activity.save();

    res.json({
      success: true,
      message: 'Response received'
    });
  } catch (error) {
    console.error('Command response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/remote/:deviceId/status
// @desc    Get device online status and capabilities
// @access  Private
router.get('/:deviceId/status', authenticate, async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.deviceId,
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
        socketConnected: !!device.socketId,
        lastSeen: device.lastSeen,
        permissions: device.permissions,
        capabilities: {
          canTakePicture: device.permissions.camera,
          canRecordAudio: device.permissions.microphone,
          canStream: device.permissions.camera && isOnline,
          canScreenshot: device.permissions.overlay,
          canLock: true
        }
      }
    });
  } catch (error) {
    console.error('Get remote status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
