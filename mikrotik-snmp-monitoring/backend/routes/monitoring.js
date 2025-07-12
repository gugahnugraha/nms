const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getDashboard,
  testDevice,
  getDeviceMonitoring,
  getMonitoringLogs,
  getReports,
  getDeviceMetrics,
  getDeviceLogs,
  getDeviceRealTimeMetrics
} = require('../controllers/monitoringController');

// @route   GET /api/monitoring/dashboard
// @desc    Get monitoring dashboard data
// @access  Private
router.get('/dashboard', auth, getDashboard);

// @route   POST /api/monitoring/test/:id
// @desc    Test device connectivity
// @access  Private
router.post('/test/:id', auth, testDevice);

// @route   GET /api/monitoring/device/:id
// @desc    Get device monitoring data
// @access  Private
router.get('/device/:id', auth, getDeviceMonitoring);

// @route   GET /api/monitoring/logs
// @desc    Get monitoring logs
// @access  Private
router.get('/logs', auth, getMonitoringLogs);

// @route   GET /api/monitoring/reports
// @desc    Get monitoring reports
// @access  Private
router.get('/reports', auth, getReports);

// @route   GET /api/monitoring/device/:deviceId/metrics
// @desc    Get device metrics for charts
// @access  Private
router.get('/device/:deviceId/metrics', auth, getDeviceMetrics);

// @route   GET /api/monitoring/device/:deviceId/logs
// @desc    Get device logs
// @access  Private
router.get('/device/:deviceId/logs', auth, getDeviceLogs);

// @route   GET /api/monitoring/device/:deviceId/real-time-metrics
// @desc    Get real-time device metrics
// @access  Private
router.get('/device/:deviceId/real-time-metrics', auth, getDeviceRealTimeMetrics);

module.exports = router;
