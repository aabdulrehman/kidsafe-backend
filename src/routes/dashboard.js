const express = require('express');
const router = express.Router();
const { Device, Call, Message, Location, Media, Activity } = require('../models');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get user's devices
    const devices = await Device.find({ 
      parentId: req.userId,
      isActive: true 
    });

    const deviceIds = devices.map(d => d._id);

    // Get counts
    const [
      totalCalls,
      totalMessages,
      totalLocations,
      totalMedia,
      unreadAlerts
    ] = await Promise.all([
      Call.countDocuments({ parentId: req.userId }),
      Message.countDocuments({ parentId: req.userId }),
      Location.countDocuments({ parentId: req.userId }),
      Media.countDocuments({ parentId: req.userId }),
      Activity.countDocuments({ parentId: req.userId, isRead: false })
    ]);

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayCalls,
      todayMessages,
      todayLocations
    ] = await Promise.all([
      Call.countDocuments({ parentId: req.userId, startTime: { $gte: today } }),
      Message.countDocuments({ parentId: req.userId, timestamp: { $gte: today } }),
      Location.countDocuments({ parentId: req.userId, timestamp: { $gte: today } })
    ]);

    // Get online devices count
    const onlineDevices = devices.filter(d => 
      d.lastSeen && (new Date() - new Date(d.lastSeen)) < 2 * 60 * 1000
    ).length;

    // Get recent activity
    const recentActivity = await Activity.find({ parentId: req.userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('deviceId', 'deviceName');

    res.json({
      success: true,
      data: {
        devices: {
          total: devices.length,
          online: onlineDevices
        },
        stats: {
          totalCalls,
          totalMessages,
          totalLocations,
          totalMedia,
          unreadAlerts
        },
        today: {
          calls: todayCalls,
          messages: todayMessages,
          locations: todayLocations
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/activity
// @desc    Get recent activity feed
// @access  Private
router.get('/activity', authenticate, async (req, res) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;

    const query = { parentId: req.userId };
    if (unreadOnly === 'true') query.isRead = false;

    const activities = await Activity.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('deviceId', 'deviceName');

    res.json({
      success: true,
      count: activities.length,
      data: { activities }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/dashboard/activity/:id/read
// @desc    Mark activity as read
// @access  Private
router.put('/activity/:id/read', authenticate, async (req, res) => {
  try {
    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.id, parentId: req.userId },
      { isRead: true },
      { new: true }
    );

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.json({
      success: true,
      message: 'Activity marked as read'
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/chart-data
// @desc    Get data for charts
// @access  Private
router.get('/chart-data', authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    // Get daily stats
    const callsByDay = await Call.aggregate([
      { 
        $match: { 
          parentId: req.userId,
          startTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const messagesByDay = await Message.aggregate([
      { 
        $match: { 
          parentId: req.userId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        calls: callsByDay,
        messages: messagesByDay
      }
    });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
