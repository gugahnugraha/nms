const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceStats,
  testConnection,
  pingDevice
} = require('../controllers/deviceController');

// @route   GET /api/devices
// @desc    Get all devices
// @access  Private
router.get('/', auth, getDevices);

// @route   GET /api/devices/:id
// @desc    Get single device
// @access  Private
router.get('/:id', auth, getDevice);

// @route   POST /api/devices
// @desc    Create new device
// @access  Private
router.post('/', auth, createDevice);

// @route   PUT /api/devices/:id
// @desc    Update device
// @access  Private
router.put('/:id', auth, updateDevice);

// @route   DELETE /api/devices/:id
// @desc    Delete device
// @access  Private
router.delete('/:id', auth, deleteDevice);

// @route   GET /api/devices/:id/stats
// @desc    Get device statistics
// @access  Private
router.get('/:id/stats', auth, getDeviceStats);

// @route   POST /api/devices/test-connection
// @desc    Test device connection
// @access  Private (Admin only)
router.post('/test-connection', auth, testConnection);

// @route   POST /api/devices/:id/ping
// @desc    Ping a device
// @access  Private
router.post('/:id/ping', auth, pingDevice);

module.exports = router;
