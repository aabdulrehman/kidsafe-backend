const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { Location, Device } = require('../models');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/locations
// @desc    Get all locations
// @access  Private
router.get('/', authenticate, [
  query('deviceId').optional().isMongoId(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const { deviceId, limit = 100, startDate, endDate } = req.query;

    const query = { parentId: req.userId };
    if (deviceId) query.deviceId = deviceId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const locations = await Location.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('deviceId', 'deviceName');

    res.json({
      success: true,
      count: locations.length,
      data: { locations }
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/locations/latest
// @desc    Get latest location for all devices
// @access  Private
router.get('/latest', authenticate, async (req, res) => {
  try {
    // Get latest location for each device
    const locations = await Location.aggregate([
      { $match: { parentId: req.userId } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$deviceId',
          location: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'devices',
          localField: '_id',
          foreignField: '_id',
          as: 'device'
        }
      },
      { $unwind: '$device' }
    ]);

    res.json({
      success: true,
      count: locations.length,
      data: { locations }
    });
  } catch (error) {
    console.error('Get latest locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/locations
// @desc    Log a new location (from Android app)
// @access  Public
router.post('/', [
  body('deviceId').notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('accuracy').optional().isFloat(),
  body('altitude').optional().isFloat(),
  body('speed').optional().isFloat(),
  body('bearing').optional().isFloat(),
  body('provider').optional(),
  body('timestamp').isISO8601(),
  body('batteryLevel').optional().isFloat({ min: 0, max: 100 })
], async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.body.deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const location = new Location({
      deviceId: device._id,
      parentId: device.parentId,
      ...req.body
    });

    await location.save();

    // Update device's last location
    device.lastLocation = {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracy: req.body.accuracy,
      timestamp: new Date(req.body.timestamp)
    };
    await device.save();

    // Emit to parent dashboard
    const io = req.app.get('io');
    io.to(`parent_${device.parentId}`).emit('location_update', {
      location: await location.populate('deviceId', 'deviceName')
    });

    res.status(201).json({
      success: true,
      message: 'Location logged successfully',
      data: { location }
    });
  } catch (error) {
    console.error('Log location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/locations/route
// @desc    Get location route for a device
// @access  Private
router.get('/route/:deviceId', authenticate, [
  param('deviceId').isMongoId(),
  query('date').optional().isISO8601()
], async (req, res) => {
  try {
    const { date } = req.query;
    const startOfDay = date ? new Date(date) : new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const locations = await Location.find({
      deviceId: req.params.deviceId,
      parentId: req.userId,
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    })
      .sort({ timestamp: 1 })
      .select('latitude longitude timestamp accuracy');

    res.json({
      success: true,
      count: locations.length,
      data: { 
        route: locations,
        date: startOfDay
      }
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
