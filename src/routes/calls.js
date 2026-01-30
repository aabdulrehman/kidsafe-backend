const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { Call, Device } = require('../models');
const { authenticate } = require('../middleware/auth');

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/recordings/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files allowed.'));
    }
  }
});

// @route   GET /api/calls
// @desc    Get all calls for user's devices
// @access  Private
router.get('/', authenticate, [
  query('deviceId').optional().isMongoId(),
  query('callType').optional().isIn(['INCOMING', 'OUTGOING', 'MISSED', 'REJECTED']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const { deviceId, callType, limit = 50, page = 1 } = req.query;

    // Build query
    const query = { parentId: req.userId };
    
    if (deviceId) query.deviceId = deviceId;
    if (callType) query.callType = callType;

    // Get user's devices
    const userDevices = await Device.find({ parentId: req.userId }).select('_id');
    const deviceIds = userDevices.map(d => d._id.toString());
    
    if (deviceId && !deviceIds.includes(deviceId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this device'
      });
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const calls = await Call.find(query)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('deviceId', 'deviceName phoneNumber');

    const total = await Call.countDocuments(query);

    res.json({
      success: true,
      count: calls.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: { calls }
    });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/calls/:id
// @desc    Get single call details
// @access  Private
router.get('/:id', authenticate, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const call = await Call.findOne({
      _id: req.params.id,
      parentId: req.userId
    }).populate('deviceId', 'deviceName phoneNumber');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.json({
      success: true,
      data: { call }
    });
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/calls
// @desc    Log a new call (from Android app)
// @access  Public (with device auth)
router.post('/', [
  body('deviceId').notEmpty(),
  body('callType').isIn(['INCOMING', 'OUTGOING', 'MISSED', 'REJECTED']),
  body('phoneNumber').notEmpty(),
  body('contactName').optional(),
  body('duration').optional().isNumeric(),
  body('startTime').isISO8601(),
  body('endTime').optional().isISO8601(),
  body('status').optional().isIn(['COMPLETED', 'MISSED', 'REJECTED', 'ONGOING']),
  body('simSlot').optional().isNumeric()
], async (req, res) => {
  try {
    const {
      deviceId,
      callType,
      phoneNumber,
      contactName,
      duration,
      startTime,
      endTime,
      status,
      simSlot
    } = req.body;

    // Find device
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const call = new Call({
      deviceId: device._id,
      parentId: device.parentId,
      callType,
      phoneNumber,
      contactName,
      duration: duration || 0,
      startTime,
      endTime,
      status: status || 'COMPLETED',
      simSlot: simSlot || 0
    });

    await call.save();

    // Emit to parent dashboard
    const io = req.app.get('io');
    io.to(`parent_${device.parentId}`).emit('new_call', {
      call: await call.populate('deviceId', 'deviceName')
    });

    res.status(201).json({
      success: true,
      message: 'Call logged successfully',
      data: { call }
    });
  } catch (error) {
    console.error('Log call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/calls/:id/recording
// @desc    Upload call recording (from Android app)
// @access  Public (with device auth)
router.post('/:id/recording', upload.single('recording'), async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No recording file provided'
      });
    }

    // Update call with recording info
    call.isRecorded = true;
    call.recordingPath = req.file.path;
    call.recordingUrl = `/uploads/recordings/${req.file.filename}`;
    call.recordingSize = req.file.size;

    await call.save();

    // Emit to parent dashboard
    const io = req.app.get('io');
    io.to(`parent_${call.parentId}`).emit('call_recording', {
      callId: call._id,
      recordingUrl: call.recordingUrl
    });

    res.json({
      success: true,
      message: 'Recording uploaded successfully',
      data: {
        recordingUrl: call.recordingUrl
      }
    });
  } catch (error) {
    console.error('Upload recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/calls/stats
// @desc    Get call statistics
// @access  Private
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const { deviceId, startDate, endDate } = req.query;

    const match = { parentId: req.userId };
    if (deviceId) match.deviceId = deviceId;
    if (startDate || endDate) {
      match.startTime = {};
      if (startDate) match.startTime.$gte = new Date(startDate);
      if (endDate) match.startTime.$lte = new Date(endDate);
    }

    const stats = await Call.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          incoming: {
            $sum: { $cond: [{ $eq: ['$callType', 'INCOMING'] }, 1, 0] }
          },
          outgoing: {
            $sum: { $cond: [{ $eq: ['$callType', 'OUTGOING'] }, 1, 0] }
          },
          missed: {
            $sum: { $cond: [{ $eq: ['$callType', 'MISSED'] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          recorded: {
            $sum: { $cond: ['$isRecorded', 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        stats: stats[0] || {
          totalCalls: 0,
          incoming: 0,
          outgoing: 0,
          missed: 0,
          totalDuration: 0,
          recorded: 0
        }
      }
    });
  } catch (error) {
    console.error('Get call stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/calls/:id
// @desc    Delete a call record
// @access  Private
router.delete('/:id', authenticate, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const call = await Call.findOneAndDelete({
      _id: req.params.id,
      parentId: req.userId
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.json({
      success: true,
      message: 'Call deleted successfully'
    });
  } catch (error) {
    console.error('Delete call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
