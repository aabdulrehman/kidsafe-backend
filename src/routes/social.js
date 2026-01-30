const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const { Message, Device } = require('../models');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/social
// @desc    Get social media activity
// @access  Private
router.get('/', authenticate, [
  query('deviceId').optional().isMongoId(),
  query('app').optional().isIn(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'SNAPCHAT', 'TELEGRAM', 'TIKTOK', 'VIBER', 'SKYPE', 'LINE', 'SIGNAL']),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { deviceId, app, limit = 50 } = req.query;

    const query = { 
      parentId: req.userId,
      appName: { $in: ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'SNAPCHAT', 'TELEGRAM', 'TIKTOK', 'VIBER', 'SKYPE', 'LINE', 'SIGNAL'] }
    };
    
    if (deviceId) query.deviceId = deviceId;
    if (app) query.appName = app;

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('deviceId', 'deviceName');

    // Group by app
    const grouped = messages.reduce((acc, msg) => {
      if (!acc[msg.appName]) acc[msg.appName] = [];
      acc[msg.appName].push(msg);
      return acc;
    }, {});

    res.json({
      success: true,
      count: messages.length,
      data: { 
        activity: messages,
        grouped
      }
    });
  } catch (error) {
    console.error('Get social error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/social/stats
// @desc    Get social media statistics
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.query;

    const match = { 
      parentId: req.userId,
      appName: { $in: ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'SNAPCHAT', 'TELEGRAM', 'TIKTOK', 'VIBER', 'SKYPE', 'LINE', 'SIGNAL'] }
    };
    if (deviceId) match.deviceId = deviceId;

    const stats = await Message.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$appName',
          count: { $sum: 1 },
          incoming: {
            $sum: { $cond: [{ $eq: ['$direction', 'INCOMING'] }, 1, 0] }
          },
          outgoing: {
            $sum: { $cond: [{ $eq: ['$direction', 'OUTGOING'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get social stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
