const Device = require('../models/Device');
const MonitoringLog = require('../models/MonitoringLog');
const { pingHost } = require('../utils/pingUtils');
const { 
  testSnmpConnectivity,
  getSystemInfo,
  getResourceUsage,
  getInterfaceStats,
  getTemperature
} = require('../utils/snmpUtils');

// @desc    Get monitoring dashboard data
// @route   GET /api/monitoring/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    // Get filter for user role
    let deviceFilter = {};
    if (req.user.role !== 'admin') {
      deviceFilter.createdBy = req.user._id;
    }

    // Get total devices
    const totalDevices = await Device.countDocuments(deviceFilter);
    
    // Get devices by status
    const devicesByStatus = await Device.aggregate([
      { $match: deviceFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent logs (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await MonitoringLog.find({
      timestamp: { $gte: last24Hours }
    })
    .populate('device', 'name ipAddress')
    .sort({ timestamp: -1 })
    .limit(50);

    // Get devices with their last status
    const devicesWithStatus = await Device.find(deviceFilter)
      .populate('createdBy', 'username')
      .sort({ lastSeen: -1 });

    // Calculate uptime statistics
    const uptimeStats = await MonitoringLog.aggregate([
      {
        $match: {
          timestamp: { $gte: last24Hours }
        }
      },
      {
        $lookup: {
          from: 'devices',
          localField: 'device',
          foreignField: '_id',
          as: 'deviceInfo'
        }
      },
      {
        $match: {
          ...(req.user.role !== 'admin' && {
            'deviceInfo.createdBy': req.user._id
          })
        }
      },
      {
        $group: {
          _id: '$device',
          totalChecks: { $sum: 1 },
          onlineChecks: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          avgResponseTime: { $avg: '$responseTime' }
        }
      },
      {
        $addFields: {
          uptime: {
            $cond: [
              { $eq: ['$totalChecks', 0] },
              0,
              { $multiply: [{ $divide: ['$onlineChecks', '$totalChecks'] }, 100] }
            ]
          }
        }
      }
    ]);

    // Prepare dashboard data
    const statusCounts = {
      online: 0,
      offline: 0,
      unknown: 0
    };

    devicesByStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    const dashboardData = {
      totalDevices,
      statusCounts,
      recentLogs,
      devices: devicesWithStatus,
      uptimeStats,
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Test device connectivity
// @route   POST /api/monitoring/test/:id
// @access  Private
const testDevice = async (req, res) => {
  try {
    let deviceFilter = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      deviceFilter.createdBy = req.user._id;
    }

    const device = await Device.findOne(deviceFilter);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Test ping connectivity
    const pingResult = await pingHost(device.ipAddress);
    
    // Test SNMP connectivity
    const snmpResult = await testSnmpConnectivity(device);

    // Update device status
    const newStatus = (pingResult.success && snmpResult.success) ? 'online' : 'offline';
    
    if (device.status !== newStatus) {
      device.status = newStatus;
      device.lastSeen = new Date();
      await device.save();
    }

    res.json({
      success: true,
      data: {
        device: {
          id: device._id,
          name: device.name,
          ipAddress: device.ipAddress
        },
        ping: pingResult,
        snmp: snmpResult,
        status: newStatus,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get device monitoring data
// @route   GET /api/monitoring/device/:id
// @access  Private
const getDeviceMonitoring = async (req, res) => {
  try {
    let deviceFilter = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      deviceFilter.createdBy = req.user._id;
    }

    const device = await Device.findOne(deviceFilter);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Test connectivity first
    const pingResult = await pingHost(device.ipAddress);
    
    if (!pingResult.success) {
      console.error(`[MONITORING] Ping failed for device ${device.name} (${device.ipAddress}):`, pingResult);
      return res.json({
        success: true,
        data: {
          device: {
            id: device._id,
            name: device.name,
            ipAddress: device.ipAddress,
            status: 'offline'
          },
          ping: pingResult,
          timestamp: new Date()
        }
      });
    }

    // Get SNMP data
    try {
      const [systemInfo, resourceUsage, interfaceStats, temperature] = await Promise.all([
        getSystemInfo(device).catch(err => ({ error: err.message })),
        getResourceUsage(device).catch(err => ({ error: err.message })),
        getInterfaceStats(device).catch(err => ({ error: err.message })),
        getTemperature(device).catch(err => ({ error: err.message }))
      ]);

      // Create monitoring log
      const monitoringData = {
        device: device._id,
        status: 'online',
        responseTime: pingResult.responseTime,
        cpuUsage: resourceUsage.cpuUsage || null,
        memoryUsage: resourceUsage.memoryUsage || null,
        diskUsage: resourceUsage.diskUsage || null,
        temperature: temperature.boardTemperature || temperature.cpuTemperature || null,
        uptime: systemInfo.uptime || null,
        interfaceStats: interfaceStats.error ? [] : interfaceStats.map(iface => ({
          interfaceName: iface.name,
          bytesIn: iface.bytesIn,
          bytesOut: iface.bytesOut,
          packetsIn: iface.packetsIn,
          packetsOut: iface.packetsOut,
          errorsIn: iface.errorsIn,
          errorsOut: iface.errorsOut
        })),
        snmpData: {
          systemInfo,
          resourceUsage,
          temperature
        }
      };

      // Save to database
      await MonitoringLog.create(monitoringData);

      // Update device status
      if (device.status !== 'online') {
        device.status = 'online';
        device.lastSeen = new Date();
        await device.save();
      }

      res.json({
        success: true,
        data: {
          device: {
            id: device._id,
            name: device.name,
            ipAddress: device.ipAddress,
            status: 'online'
          },
          ping: pingResult,
          monitoring: monitoringData,
          timestamp: new Date()
        }
      });
    } catch (snmpError) {
      // SNMP failed but ping worked
      console.error(`[MONITORING] SNMP error for device ${device.name} (${device.ipAddress}):`, snmpError);
      const monitoringData = {
        device: device._id,
        status: 'online',
        responseTime: pingResult.responseTime,
        errorMessage: `SNMP Error: ${snmpError.message}`
      };

      await MonitoringLog.create(monitoringData);

      res.json({
        success: true,
        data: {
          device: {
            id: device._id,
            name: device.name,
            ipAddress: device.ipAddress,
            status: 'online'
          },
          ping: pingResult,
          monitoring: monitoringData,
          error: snmpError.message,
          timestamp: new Date()
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get monitoring logs
// @route   GET /api/monitoring/logs
// @access  Private
const getMonitoringLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, deviceId, status, startDate, endDate } = req.query;

    // Build filter
    let filter = {};
    
    if (deviceId) filter.device = deviceId;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // If user is not admin, filter by their devices
    if (req.user.role !== 'admin') {
      const userDevices = await Device.find({ createdBy: req.user._id }).select('_id');
      const userDeviceIds = userDevices.map(d => d._id);
      filter.device = { $in: userDeviceIds };
    }

    const logs = await MonitoringLog.find(filter)
      .populate('device', 'name ipAddress deviceType')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MonitoringLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
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

// @desc    Get monitoring reports
// @route   GET /api/monitoring/reports
// @access  Private
const getReports = async (req, res) => {
  try {
    const { period = '24h', deviceId } = req.query;

    // Calculate date range
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Build filter
    let filter = {
      timestamp: { $gte: startDate }
    };

    if (deviceId) {
      filter.device = deviceId;
    }

    // If user is not admin, filter by their devices
    if (req.user.role !== 'admin') {
      const userDevices = await Device.find({ createdBy: req.user._id }).select('_id');
      const userDeviceIds = userDevices.map(d => d._id);
      filter.device = deviceId ? deviceId : { $in: userDeviceIds };
    }

    // Get aggregated data
    const reports = await MonitoringLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            device: '$device',
            hour: { $hour: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            month: { $month: '$timestamp' },
            year: { $year: '$timestamp' }
          },
          totalChecks: { $sum: 1 },
          onlineChecks: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          avgResponseTime: { $avg: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          avgCpuUsage: { $avg: '$cpuUsage' },
          avgMemoryUsage: { $avg: '$memoryUsage' },
          avgTemperature: { $avg: '$temperature' }
        }
      },
      {
        $addFields: {
          uptime: {
            $cond: [
              { $eq: ['$totalChecks', 0] },
              0,
              { $multiply: [{ $divide: ['$onlineChecks', '$totalChecks'] }, 100] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'devices',
          localField: '_id.device',
          foreignField: '_id',
          as: 'deviceInfo'
        }
      },
      {
        $unwind: '$deviceInfo'
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.hour': -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        reports,
        period,
        startDate,
        endDate: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get device metrics for charts
// @route   GET /api/monitoring/device/:deviceId/metrics
// @access  Private
const getDeviceMetrics = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { timeRange = '24h' } = req.query;

    // Verify device access
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && device.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate time range
    let startDate = new Date();
    switch (timeRange) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '6h':
        startDate.setHours(startDate.getHours() - 6);
        break;
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 1);
    }

    // Get metrics data from logs
    const metrics = await MonitoringLog.find({
      device: deviceId,
      timestamp: { $gte: startDate }
    })
    .sort({ timestamp: 1 })
    .select('timestamp cpuUsage memoryUsage responseTime diskUsage temperature')
    .limit(500); // Limit to 500 data points for performance

    // If metrics are empty or minimal, try to get a live snapshot
    if (metrics.length < 2) {
      try {
        console.log(`Fetching live metrics for device ${deviceId} (${device.name})`);
        const pingResult = await pingHost(device.ipAddress);
        
        if (!pingResult.success) {
          console.log(`Device ${deviceId} is offline`);
          return res.json({
            success: true,
            data: metrics
          });
        }
        
        const responseTime = pingResult.time;
        
        // Get resource usage via SNMP
        const resourceUsage = await getResourceUsage(device);
        const temperature = await getTemperature(device);
        
        // Create a new metrics point
        const newMetric = {
          timestamp: new Date(),
          cpuUsage: resourceUsage.cpuUsage,
          memoryUsage: resourceUsage.memoryUsage,
          diskUsage: resourceUsage.diskUsage,
          responseTime: responseTime,
          temperature: temperature.boardTemperature || temperature.cpuTemperature
        };
        
        // If we have at least one metric, add the new one
        if (metrics.length > 0) {
          metrics.push(newMetric);
        } else {
          // If we have no metrics, create two points to make the chart work
          const fakeTimestamp = new Date();
          fakeTimestamp.setMinutes(fakeTimestamp.getMinutes() - 5);
          
          metrics.push({
            timestamp: fakeTimestamp,
            cpuUsage: resourceUsage.cpuUsage,
            memoryUsage: resourceUsage.memoryUsage,
            diskUsage: resourceUsage.diskUsage,
            responseTime: responseTime,
            temperature: temperature.boardTemperature || temperature.cpuTemperature
          });
          
          metrics.push(newMetric);
          
          // Save this as a real monitoring log
          const monitoringLog = new MonitoringLog({
            device: deviceId,
            status: 'online',
            responseTime: responseTime,
            cpuUsage: resourceUsage.cpuUsage,
            memoryUsage: resourceUsage.memoryUsage,
            diskUsage: resourceUsage.diskUsage,
            temperature: temperature.boardTemperature || temperature.cpuTemperature,
            message: 'Live metrics collected',
            raw: JSON.stringify({
              ping: pingResult,
              resources: resourceUsage,
              temperature: temperature
            })
          });
          
          await monitoringLog.save();
          console.log(`Saved new monitoring log for device ${deviceId}`);
        }
      } catch (snmpError) {
        console.error(`Failed to get live SNMP data for device ${deviceId}:`, snmpError);
      }
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting device metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get device logs
// @route   GET /api/monitoring/device/:deviceId/logs
// @access  Private
const getDeviceLogs = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { page = 1, limit = 50, status, startDate, endDate } = req.query;

    // Verify device access
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && device.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build filter
    let filter = { device: deviceId };
    
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await MonitoringLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('timestamp status responseTime error cpuUsage memoryUsage');

    const total = await MonitoringLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
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

// @desc    Get real-time device metrics
// @route   GET /api/monitoring/device/:deviceId/real-time-metrics
// @access  Private
const getDeviceRealTimeMetrics = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Verify device access
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && device.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    console.log(`Fetching real-time metrics for device ${deviceId} (${device.name})`);

    // Test if device is reachable
    const pingResult = await pingHost(device.ipAddress);
    
    if (!pingResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Device is offline',
        data: {
          status: 'offline',
          responseTime: null
        }
      });
    }

    try {
      // Get all metrics at once
      const [systemInfo, resourceUsage, temperature] = await Promise.all([
        getSystemInfo(device).catch(err => ({ error: err.message })),
        getResourceUsage(device).catch(err => ({ error: err.message })),
        getTemperature(device).catch(err => ({ error: err.message }))
      ]);

      // Create metrics object
      const metrics = {
        timestamp: new Date(),
        cpuUsage: resourceUsage.cpuUsage,
        memoryUsage: resourceUsage.memoryUsage,
        diskUsage: resourceUsage.diskUsage,
        temperature: temperature.boardTemperature || temperature.cpuTemperature,
        responseTime: pingResult.time,
        uptime: systemInfo.uptime,
        systemName: systemInfo.name,
        systemLocation: systemInfo.location
      };

      // Save this data to the monitoring log
      const monitoringLog = new MonitoringLog({
        device: deviceId,
        status: 'online',
        responseTime: pingResult.time,
        cpuUsage: resourceUsage.cpuUsage,
        memoryUsage: resourceUsage.memoryUsage,
        diskUsage: resourceUsage.diskUsage,
        temperature: temperature.boardTemperature || temperature.cpuTemperature,
        message: 'Real-time metrics collected',
        raw: JSON.stringify({
          ping: pingResult,
          system: systemInfo,
          resources: resourceUsage,
          temperature: temperature
        })
      });
      
      await monitoringLog.save();
      console.log(`Saved real-time metrics for device ${deviceId}`);

      // Return the metrics
      res.json({
        success: true,
        data: metrics
      });
    } catch (snmpError) {
      console.error(`SNMP error for device ${deviceId}:`, snmpError);
      res.status(500).json({
        success: false,
        message: 'Failed to collect SNMP metrics',
        error: snmpError.message
      });
    }
  } catch (error) {
    console.error('Error getting real-time device metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getDashboard,
  testDevice,
  getDeviceMonitoring,
  getMonitoringLogs,
  getReports,
  getDeviceMetrics,
  getDeviceLogs,
  getDeviceRealTimeMetrics
};
