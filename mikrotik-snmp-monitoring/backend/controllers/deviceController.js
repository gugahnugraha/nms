const Device = require('../models/Device');
const MonitoringLog = require('../models/MonitoringLog');
const { pingHost } = require('../utils/pingUtils');
const { testSNMP } = require('../utils/snmpUtils');
const snmpExporterController = require('./snmpExporterController');

// @desc    Ping a device
// @route   POST /api/devices/:id/ping
// @access  Private
const pingDevice = async (req, res) => {
  try {
    console.log(`Ping request for device ID: ${req.params.id}`);
    const device = await Device.findById(req.params.id);

    if (!device) {
      console.log(`Device not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    // Optional: Check if user has permission
    if (req.user.role !== 'admin' && device.createdBy.toString() !== req.user._id.toString()) {
      console.log(`User ${req.user._id} not authorized to ping device ${device._id}`);
      return res.status(403).json({ success: false, message: 'Not authorized to ping this device' });
    }

    console.log(`Attempting to ping device ${device.name} at ${device.ipAddress}`);
    const pingResult = await pingHost(device.ipAddress);
    console.log(`Ping result for ${device.ipAddress}:`, pingResult);

    // Update device status based on ping result
    if (pingResult.success && device.status !== 'online') {
      device.status = 'online';
      device.lastSeen = new Date();
      await device.save();
      console.log(`Device ${device.name} status updated to online`);
    } else if (!pingResult.success && device.status !== 'offline') {
      device.status = 'offline';
      await device.save();
      console.log(`Device ${device.name} status updated to offline`);
    }

    res.json({
      success: pingResult.success,
      message: pingResult.success ? `Ping to ${device.ipAddress} was successful.` : `Ping to ${device.ipAddress} failed.`,
      raw: pingResult.output || pingResult.error
    });
  } catch (error) {
    console.error('Error in pingDevice controller:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during ping',
      raw: error.message
    });
  }
};

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
const getDevices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, deviceType, search } = req.query;
    
    console.log(`Fetching devices with params: page=${page}, limit=${limit}, status=${status}, deviceType=${deviceType}, search=${search}`);
    
    // Build filter object
    let filter = {};
    
    if (status) filter.status = status;
    if (deviceType) filter.deviceType = deviceType;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // If user is not admin, only show their devices
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }

    // Skip pagination if limit is very large
    let query = Device.find(filter)
      .populate('createdBy', 'username firstName lastName')
      .sort({ deviceId: 1 }); // Sort by deviceId ascending
    
    // Only apply limit and skip if limit is reasonable (not for "show all" requests)
    if (limit < 1000) {
      query = query.limit(limit * 1).skip((page - 1) * limit);
    }
    
    const devices = await query;

    const total = await Device.countDocuments(filter);

    res.json({
      success: true,
      data: {
        devices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
// @access  Private
const getDevice = async (req, res) => {
  try {
    let filter = { _id: req.params.id };
    
    // If user is not admin, only show their devices
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }

    const device = await Device.findOne(filter)
      .populate('createdBy', 'username firstName lastName');

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.json({
      success: true,
      data: {
        device
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create device
// @route   POST /api/devices
// @access  Private
const createDevice = async (req, res) => {
  try {
    // Ensure deviceId is provided
    if (!req.body.deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    // Check if the device ID already exists
    const existingDevice = await Device.findOne({ deviceId: req.body.deviceId });
    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: 'Device ID already exists'
      });
    }

    const deviceData = {
      ...req.body,
      createdBy: req.user._id,
      // Make sure autoCollect is enabled by default
      autoCollect: req.body.autoCollect !== false // Only disable if explicitly set to false
    };

    const device = await Device.create(deviceData);
    await device.populate('createdBy', 'username firstName lastName');

    // Start the collector automatically if the device is reachable
    try {
      // Check if device is reachable
      const pingResult = await pingHost(device.ipAddress);
      if (pingResult.success && device.autoCollect) {
        // Use internal method to start collector without HTTP context
        await snmpExporterController.startDeviceCollector({
          params: { deviceId: device._id },
          user: req.user,
          body: {}
        }, {
          status: () => ({ json: () => {} }),
          json: () => {}
        });
        console.log(`Started auto-collector for new device ${device.name}`);
      }
    } catch (collectorError) {
      console.error(`Error starting collector for new device ${device.name}:`, collectorError);
      // Don't fail the device creation if collector fails to start
    }

    res.status(201).json({
      success: true,
      message: 'Device created successfully',
      data: {
        device
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private
const updateDevice = async (req, res) => {
  try {
    let filter = { _id: req.params.id };
    
    // If user is not admin, only allow updating their devices
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }
    
    // Get the original device to check for status changes
    const originalDevice = await Device.findOne(filter);
    if (!originalDevice) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or access denied'
      });
    }
    
    // Check if deviceId is being changed and validate uniqueness
    if (req.body.deviceId && req.body.deviceId !== originalDevice.deviceId) {
      const existingDevice = await Device.findOne({ deviceId: req.body.deviceId });
      if (existingDevice) {
        return res.status(400).json({
          success: false,
          message: 'Device ID already exists'
        });
      }
    }
    
    // Update the device
    const device = await Device.findOneAndUpdate(
      filter,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'username firstName lastName');

    // Handle collector changes if autoCollect setting changed
    if (device.autoCollect !== originalDevice.autoCollect) {
      try {
        if (device.autoCollect) {
          // Start collector if it's now enabled
          await snmpExporterController.startDeviceCollector({
            params: { deviceId: device._id },
            user: req.user,
            body: {}
          }, {
            status: () => ({ json: () => {} }),
            json: () => {}
          });
          console.log(`Started collector for device ${device.name} after update`);
        } else {
          // Stop collector if it's now disabled
          await snmpExporterController.stopDeviceCollector({
            params: { deviceId: device._id },
            user: req.user
          }, {
            status: () => ({ json: () => {} }),
            json: () => {}
          });
          console.log(`Stopped collector for device ${device.name} after update`);
        }
      } catch (collectorError) {
        console.error(`Error updating collector for device ${device.name}:`, collectorError);
        // Don't fail the device update if collector changes fail
      }
    }

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: {
        device
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Private
const deleteDevice = async (req, res) => {
  try {
    let filter = { _id: req.params.id };
    
    // If user is not admin, only allow deleting their devices
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }

    const device = await Device.findOneAndDelete(filter);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or access denied'
      });
    }

    // Also delete related monitoring logs
    await MonitoringLog.deleteMany({ device: req.params.id });

    res.json({
      success: true,
      message: 'Device and related logs deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get device statistics
// @route   GET /api/devices/:id/stats
// @access  Private
const getDeviceStats = async (req, res) => {
  try {
    let filter = { _id: req.params.id };
    
    // If user is not admin, only show their devices
    if (req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }

    const device = await Device.findOne(filter);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Get monitoring stats for the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const stats = await MonitoringLog.aggregate([
      {
        $match: {
          device: device._id,
          timestamp: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: null,
          totalChecks: { $sum: 1 },
          onlineChecks: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          avgResponseTime: { $avg: '$responseTime' },
          avgCpuUsage: { $avg: '$cpuUsage' },
          avgMemoryUsage: { $avg: '$memoryUsage' },
          maxResponseTime: { $max: '$responseTime' },
          minResponseTime: { $min: '$responseTime' }
        }
      }
    ]);

    const deviceStats = stats[0] || {
      totalChecks: 0,
      onlineChecks: 0,
      avgResponseTime: 0,
      avgCpuUsage: 0,
      avgMemoryUsage: 0,
      maxResponseTime: 0,
      minResponseTime: 0
    };

    deviceStats.uptime = deviceStats.totalChecks > 0 
      ? (deviceStats.onlineChecks / deviceStats.totalChecks) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        device,
        stats: deviceStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Test device connection
// @route   POST /api/devices/test-connection
// @access  Private (Admin only)
const testConnection = async (req, res) => {
  try {
    const { ipAddress, snmpCommunity, snmpPort, snmpVersion } = req.body;

    if (!ipAddress || !snmpCommunity) {
      return res.status(400).json({
        success: false,
        message: 'IP address and SNMP community are required'
      });
    }

    // Create SNMP config object
    const snmpConfig = {
      community: snmpCommunity,
      port: snmpPort || 161,
      version: snmpVersion || '2c'
    };

    const results = {
      ping: null,
      snmp: null,
      deviceInfo: null
    };

    // Test ping connectivity
    try {
      results.ping = await testPing(ipAddress);
    } catch (error) {
      results.ping = { success: false, error: error.message };
    }

    // Test SNMP connectivity
    try {
      results.snmp = await testSNMP(ipAddress, snmpConfig);
      
      // If SNMP works, try to get device info
      if (results.snmp.success) {
        const { getSNMPData } = require('../utils/snmpUtils');
        try {
          const deviceInfo = await getSNMPData(ipAddress, snmpConfig, [
            '1.3.6.1.2.1.1.1.0', // sysDescr
            '1.3.6.1.2.1.1.5.0', // sysName
            '1.3.6.1.4.1.14988.1.1.4.4.0' // MikroTik software version
          ]);
          
          results.deviceInfo = {
            description: deviceInfo['1.3.6.1.2.1.1.1.0'],
            hostname: deviceInfo['1.3.6.1.2.1.1.5.0'],
            version: deviceInfo['1.3.6.1.4.1.14988.1.1.4.4.0']
          };
        } catch (error) {
          console.warn('Could not fetch device info:', error.message);
        }
      }
    } catch (error) {
      results.snmp = { success: false, error: error.message };
    }

    const overallSuccess = results.ping?.success && results.snmp?.success;

    res.json({
      success: overallSuccess,
      message: overallSuccess ? 'Connection test successful' : 'Connection test failed',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceStats,
  testConnection,
  pingDevice
};
