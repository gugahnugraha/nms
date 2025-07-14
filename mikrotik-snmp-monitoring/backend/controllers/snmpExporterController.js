const mongoose = require('mongoose');
const Device = require('../models/Device');
const MonitoringLog = require('../models/MonitoringLog');
const { pingHost } = require('../utils/pingUtils');
const { collectMetrics, startCollector } = require('../utils/snmpExporter');

// Store active collectors for each device
const activeCollectors = {};

// @desc    Start SNMP collector for a device
// @route   POST /api/snmp-exporter/start/:deviceId
// @access  Private/Admin
const startDeviceCollector = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { intervals } = req.body;
    
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

    // Check if collector is already running
    if (activeCollectors[deviceId]) {
      return res.status(400).json({
        success: false,
        message: 'Collector is already running for this device'
      });
    }
    
    // First check if the device is reachable
    const pingResult = await pingHost(device.ipAddress);
    if (!pingResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Device is not reachable',
        data: { pingResult }
      });
    }
    
    // Start collector
    const collector = startCollector(device, async (error, metrics) => {
      if (error) {
        console.error(`Error collecting metrics for device ${device.name}:`, error);
        return;
      }
      
      // Save to database
      try {
        // Extract summary metrics
        const { summary } = metrics;
        
        // Create monitoring log
        const monitoringLog = new MonitoringLog({
          device: deviceId,
          status: 'online',
          responseTime: metrics.responseTime || 0,
          cpuUsage: summary.cpuUsage,
          memoryUsage: summary.memoryUsage,
          diskUsage: summary.diskUsage,
          temperature: summary.temperature,
          message: 'Metrics collected by SNMP Exporter',
          raw: JSON.stringify(metrics)
        });
        
        await monitoringLog.save();
        console.log(`Saved metrics for device ${device.name}`);
        
        // Update device status
        if (device.status !== 'online') {
          device.status = 'online';
          device.lastSeen = new Date();
          await device.save();
        }
      } catch (dbError) {
        console.error(`Error saving metrics for device ${device.name}:`, dbError);
      }
    });
    
    // Store the collector
    activeCollectors[deviceId] = collector;
    
    // Start the collector
    collector.start();
    
    res.json({
      success: true,
      message: `Started SNMP collector for device ${device.name}`,
      data: { deviceId, name: device.name }
    });
  } catch (error) {
    console.error('Error starting device collector:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Stop SNMP collector for a device
// @route   POST /api/snmp-exporter/stop/:deviceId
// @access  Private/Admin
const stopDeviceCollector = async (req, res) => {
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

    // Check if collector is running
    if (!activeCollectors[deviceId]) {
      return res.status(400).json({
        success: false,
        message: 'No collector is running for this device'
      });
    }
    
    // Stop collector
    activeCollectors[deviceId].stop();
    delete activeCollectors[deviceId];
    
    res.json({
      success: true,
      message: `Stopped SNMP collector for device ${device.name}`,
      data: { deviceId, name: device.name }
    });
  } catch (error) {
    console.error('Error stopping device collector:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get collector status for a device
// @route   GET /api/snmp-exporter/status/:deviceId
// @access  Private
const getCollectorStatus = async (req, res) => {
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

    const isActive = !!activeCollectors[deviceId];
    
    res.json({
      success: true,
      data: {
        deviceId,
        name: device.name,
        isActive,
        status: isActive ? 'running' : 'stopped'
      }
    });
  } catch (error) {
    console.error('Error getting collector status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get latest metrics for a device
// @route   GET /api/snmp-exporter/metrics/:deviceId
// @access  Private
const getLatestMetrics = async (req, res) => {
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

    // Collect metrics directly
    try {
      const metrics = await collectMetrics(device);
      // Save to database
      const { summary } = metrics;
      // Create monitoring log
      const monitoringLog = new MonitoringLog({
        device: deviceId,
        status: 'online',
        responseTime: 0, // We don't have ping data here
        cpuUsage: summary.cpuUsage,
        memoryUsage: summary.memoryUsage,
        diskUsage: summary.diskUsage,
        temperature: summary.temperature,
        message: 'Ad-hoc metrics collection',
        raw: JSON.stringify(metrics)
      });
      await monitoringLog.save();
      res.json({
        success: true,
        data: metrics
      });
    } catch (snmpError) {
      console.error(`Failed to collect metrics for device ${device.name}:`, snmpError);
      // Fallback: get latest MonitoringLog from DB
      try {
        const latestLog = await MonitoringLog.findOne({ device: deviceId })
          .sort({ createdAt: -1 });
        if (latestLog) {
          let rawData = null;
          try {
            rawData = typeof latestLog.raw === 'string' ? JSON.parse(latestLog.raw) : latestLog.raw;
          } catch (e) {
            rawData = null;
          }
          res.json({
            success: true,
            data: rawData || {
              summary: {
                cpuUsage: latestLog.cpuUsage,
                memoryUsage: latestLog.memoryUsage,
                diskUsage: latestLog.diskUsage,
                temperature: latestLog.temperature,
                status: latestLog.status,
                responseTime: latestLog.responseTime,
                message: latestLog.message
              }
            },
            fallback: true,
            message: 'Returned latest metrics from database due to SNMP failure.'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to collect metrics and no previous data found',
            error: snmpError.message
          });
        }
      } catch (dbError) {
        res.status(500).json({
          success: false,
          message: 'Failed to collect metrics and failed to fetch from database',
          error: snmpError.message + ' | DB: ' + dbError.message
        });
      }
    }
  } catch (error) {
    console.error('Error getting latest metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get list of active collectors
// @route   GET /api/snmp-exporter/active
// @access  Private/Admin
const getActiveCollectors = async (req, res) => {
  try {
    // Only admin can see all collectors
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const activeDeviceIds = Object.keys(activeCollectors);
    const devices = await Device.find({ _id: { $in: activeDeviceIds } })
      .select('name ipAddress status');
    
    const collectorData = devices.map(device => ({
      deviceId: device._id,
      name: device.name,
      ipAddress: device.ipAddress,
      status: device.status,
      isActive: true
    }));
    
    res.json({
      success: true,
      data: {
        count: collectorData.length,
        collectors: collectorData
      }
    });
  } catch (error) {
    console.error('Error getting active collectors:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    DEBUG: Insert a test MonitoringLog with real metric values
// @route   POST /api/snmp-exporter/debug-insert/:deviceId
// @access  Private/Admin
const debugInsertTestLog = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    // Only admin can use this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // Example metrics
    const metrics = {
      deviceId,
      deviceName: device.name,
      ipAddress: device.ipAddress,
      timestamp: new Date(),
      metrics: {
        system: {
          sysDescr: 'MikroTik RouterOS',
          sysUpTime: 123456,
          sysName: device.name,
          sysLocation: 'Lab'
        },
        resources: {
          cpuUsage: 42,
          memorySize: 256144
        },
        storage: [],
        temperature: {
          boardTemperature: 45.2,
          cpuTemperature: 47.8
        },
        interfaces: [
          {
            index: 1,
            ifDescr: 'ether1',
            ifOperStatus: 1,
            ifInOctets: 12345678,
            ifOutOctets: 87654321,
            ifInErrors: 0,
            ifOutErrors: 0,
            status: 'up'
          }
        ]
      },
      summary: {
        cpuUsage: 42,
        memoryUsage: 67,
        diskUsage: 80,
        temperature: 45.2,
        uptime: 1234,
        status: 'ok',
        errors: []
      }
    };
    const monitoringLog = new MonitoringLog({
      device: deviceId,
      status: 'online',
      responseTime: 10,
      cpuUsage: metrics.summary.cpuUsage,
      memoryUsage: metrics.summary.memoryUsage,
      diskUsage: metrics.summary.diskUsage,
      temperature: metrics.summary.temperature,
      message: 'DEBUG: Manual test log',
      raw: JSON.stringify(metrics)
    });
    await monitoringLog.save();
    res.json({ success: true, message: 'Inserted test log', data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Initialize collectors for devices marked as "auto-collect" when server starts
const initializeCollectors = async () => {
  try {
    console.log('Initializing SNMP collectors...');
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('Database connection is not ready. Current state:', mongoose.connection.readyState);
      console.log('Waiting for database connection to be established...');
      
      // Wait for 10 seconds to see if the connection establishes
      await new Promise((resolve) => setTimeout(resolve, 10000));
      
      // Check again
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`Database connection is still not ready after waiting. State: ${mongoose.connection.readyState}`);
      }
      
      console.log('Database connection is now ready. Proceeding with collector initialization.');
    }
    
    // Find devices with autoCollect flag - include all devices regardless of status
    console.log('Querying database for devices with autoCollect enabled...');
    const devices = await Device.find({ autoCollect: true }).lean().exec();
    
    console.log(`Found ${devices.length} devices with auto-collect enabled`);
    
    // Start collectors for each device
    for (const device of devices) {
      try {
        // Skip already started collectors
        if (activeCollectors[device._id]) {
          console.log(`Collector for device ${device.name} is already running, skipping`);
          continue;
        }
        
        // Check if device is reachable
        console.log(`Checking if device ${device.name} (${device.ipAddress}) is reachable...`);
        const pingResult = await pingHost(device.ipAddress);
        
        if (!pingResult.success) {
          console.log(`Device ${device.name} is not reachable, will retry on next ping cycle`);
          
          // Update device status
          if (device.status !== 'offline') {
            device.status = 'offline';
            await device.save();
            console.log(`Updated device ${device.name} status to offline`);
          }
          
          continue;
        }
        
        // Update device status if needed
        if (device.status !== 'online') {
          device.status = 'online';
          device.lastSeen = new Date();
          await device.save();
          console.log(`Updated device ${device.name} status to online`);
        }
        
        // Start collector
        console.log(`Starting collector for device ${device.name}...`);
        const collector = startCollector(device, async (error, metrics) => {
          if (error) {
            console.error(`Error collecting metrics for device ${device.name}:`, error);
            return;
          }
          
          // Save to database
          try {
            // Extract summary metrics
            const { summary } = metrics;
            
            // Create monitoring log
            const monitoringLog = new MonitoringLog({
              device: device._id,
              status: 'online',
              responseTime: metrics.responseTime || 0,
              cpuUsage: summary.cpuUsage,
              memoryUsage: summary.memoryUsage,
              diskUsage: summary.diskUsage,
              temperature: summary.temperature,
              message: 'Auto-collected metrics',
              raw: JSON.stringify(metrics)
            });
            
            await monitoringLog.save();
            
            // Update device status
            if (device.status !== 'online') {
              device.status = 'online';
              device.lastSeen = new Date();
              await device.save();
            }
          } catch (dbError) {
            console.error(`Error saving metrics for device ${device.name}:`, dbError);
          }
        });
        
        // Store the collector
        activeCollectors[device._id] = collector;
        
        // Start the collector
        collector.start();
        
        console.log(`Started auto-collector for device ${device.name}`);
      } catch (deviceError) {
        console.error(`Error initializing collector for device ${device.name}:`, deviceError);
      }
    }
    
    console.log('SNMP collectors initialization complete');
  } catch (error) {
    console.error('Error initializing collectors:', error);
  }
};

// Clean up collectors when server shuts down
const cleanupCollectors = () => {
  console.log('Cleaning up SNMP collectors...');
  
  for (const deviceId in activeCollectors) {
    try {
      activeCollectors[deviceId].stop();
      console.log(`Stopped collector for device ${deviceId}`);
    } catch (error) {
      console.error(`Error stopping collector for device ${deviceId}:`, error);
    }
  }
  
  console.log('SNMP collectors cleanup complete');
};

module.exports = {
  startDeviceCollector,
  stopDeviceCollector,
  getCollectorStatus,
  getLatestMetrics,
  getActiveCollectors,
  initializeCollectors,
  cleanupCollectors,
  debugInsertTestLog
};
