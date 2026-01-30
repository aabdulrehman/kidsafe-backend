const express = require('express');
const multer = require('multer');
const path = require('path');
const { param, query } = require('express-validator');
const router = express.Router();
const { Media, Device } = require('../models');
const { authenticate } = require('../middleware/auth');

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mediaType = req.body.mediaType || 'OTHER';
    let folder = 'uploads/media/';
    if (mediaType === 'PHOTO' || file.mimetype.startsWith('image/')) folder += 'photos/';
    else if (mediaType === 'VIDEO' || file.mimetype.startsWith('video/')) folder += 'videos/';
    else if (mediaType === 'AUDIO' || file.mimetype.startsWith('audio/')) folder += 'audio/';
    else folder += 'documents/';
    
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// @route   GET /api/media
// @desc    Get all media files
// @access  Private
router.get('/', authenticate, [
  query('deviceId').optional().isMongoId(),
  query('mediaType').optional().isIn(['PHOTO', 'VIDEO', 'AUDIO', 'DOCUMENT']),
  query('source').optional(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const { deviceId, mediaType, source, limit = 30, page = 1 } = req.query;

    const query = { parentId: req.userId };
    if (deviceId) query.deviceId = deviceId;
    if (mediaType) query.mediaType = mediaType;
    if (source) query.source = source;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const media = await Media.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('deviceId', 'deviceName');

    const total = await Media.countDocuments(query);

    res.json({
      success: true,
      count: media.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: { media }
    });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/media
// @desc    Upload media (from Android app)
// @access  Public
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { deviceId, mediaType, source, timestamp, width, height, duration } = req.body;

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const media = new Media({
      deviceId: device._id,
      parentId: device.parentId,
      mediaType: mediaType || 'OTHER',
      source: source || 'OTHER',
      fileName: req.file.originalname,
      url: `/uploads/media/${mediaType === 'PHOTO' ? 'photos' : mediaType === 'VIDEO' ? 'videos' : mediaType === 'AUDIO' ? 'audio' : 'documents'}/${req.file.filename}`,
      path: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      width,
      height,
      duration,
      timestamp: timestamp || new Date()
    });

    await media.save();

    // Emit to parent dashboard
    const io = req.app.get('io');
    io.to(`parent_${device.parentId}`).emit('new_media', {
      media: await media.populate('deviceId', 'deviceName')
    });

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: { media }
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

// @route   GET /api/media/:id
// @desc    Get single media file
// @access  Private
router.get('/:id', authenticate, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      parentId: req.userId
    }).populate('deviceId', 'deviceName');

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    res.json({
      success: true,
      data: { media }
    });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/media/:id
// @desc    Delete media file
// @access  Private
router.delete('/:id', authenticate, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const media = await Media.findOneAndDelete({
      _id: req.params.id,
      parentId: req.userId
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
