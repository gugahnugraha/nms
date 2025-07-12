const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const {
  startDeviceCollector,
  stopDeviceCollector,
  getCollectorStatus,
  getLatestMetrics,
  getActiveCollectors
} = require('../controllers/snmpExporterController');

// @route   POST /api/snmp-exporter/start/:deviceId
// @desc    Start SNMP collector for a device
// @access  Private/Admin
router.post('/start/:deviceId', auth, startDeviceCollector);

// @route   POST /api/snmp-exporter/stop/:deviceId
// @desc    Stop SNMP collector for a device
// @access  Private/Admin
router.post('/stop/:deviceId', auth, stopDeviceCollector);

// @route   GET /api/snmp-exporter/status/:deviceId
// @desc    Get collector status for a device
// @access  Private
router.get('/status/:deviceId', auth, getCollectorStatus);

// @route   GET /api/snmp-exporter/metrics/:deviceId
// @desc    Get latest metrics for a device
// @access  Private
router.get('/metrics/:deviceId', auth, getLatestMetrics);

// @route   GET /api/snmp-exporter/active
// @desc    Get list of active collectors
// @access  Private/Admin
router.get('/active', auth, adminOnly, getActiveCollectors);

module.exports = router;
