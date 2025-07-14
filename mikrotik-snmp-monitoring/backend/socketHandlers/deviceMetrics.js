const Device = require('../models/Device');
const MonitoringLog = require('../models/MonitoringLog');

// @desc    Handle device metrics subscription
// @param   socket - Socket.IO socket instance
// @param   deviceId - Device ID to subscribe to
const handleDeviceMetrics = (socket, deviceId) => {
  try {
    // Join the device metrics room
    socket.join(`device_metrics_${deviceId}`);
    console.log(`Client ${socket.id} subscribed to device metrics for device ${deviceId}`);

    // Send initial metrics
    sendInitialMetrics(socket, deviceId);
  } catch (error) {
    console.error('Error handling device metrics subscription:', error);
    socket.emit('error', {
      message: 'Failed to subscribe to device metrics',
      error: error.message
    });
  }
};

// @desc    Send initial metrics to newly subscribed client
// @param   socket - Socket.IO socket instance
// @param   deviceId - Device ID
const sendInitialMetrics = async (socket, deviceId) => {
  try {
    // Get latest monitoring log
    const latestLog = await MonitoringLog.findOne({ deviceId })
      .sort({ timestamp: -1 });

    if (latestLog) {
      socket.emit('device_metrics', {
        deviceId,
        timestamp: latestLog.timestamp,
        ...latestLog.metrics
      });
    } else {
      // Send empty metrics if no data available
      socket.emit('device_metrics', {
        deviceId,
        timestamp: new Date(),
        cpuUsage: 0,
        memoryUsage: 0,
        responseTime: 0,
        interfaces: []
      });
    }
  } catch (error) {
    console.error('Error sending initial metrics:', error);
    socket.emit('error', {
      message: 'Failed to send initial metrics',
      error: error.message
    });
  }
};

// @desc    Handle device metrics unsubscription
// @param   socket - Socket.IO socket instance
// @param   deviceId - Device ID to unsubscribe from
const handleDeviceMetricsUnsubscription = (socket, deviceId) => {
  try {
    // Leave the device metrics room
    socket.leave(`device_metrics_${deviceId}`);
    console.log(`Client ${socket.id} unsubscribed from device metrics for device ${deviceId}`);
  } catch (error) {
    console.error('Error handling device metrics unsubscription:', error);
    socket.emit('error', {
      message: 'Failed to unsubscribe from device metrics',
      error: error.message
    });
  }
};

// @desc    Broadcast device metrics to all subscribed clients
// @param   io - Socket.IO server instance
// @param   deviceId - Device ID
// @param   metrics - Metrics data to broadcast
const broadcastDeviceMetrics = (io, deviceId, metrics) => {
  try {
    io.to(`device_metrics_${deviceId}`).emit('device_metrics', {
      deviceId,
      timestamp: new Date(),
      ...metrics
    });
  } catch (error) {
    console.error('Error broadcasting device metrics:', error);
  }
};

// @desc    Handle device status updates
// @param   io - Socket.IO server instance
// @param   deviceId - Device ID
// @param   status - New device status
const broadcastDeviceStatus = (io, deviceId, status) => {
  try {
    io.to(`device_metrics_${deviceId}`).emit('device_status', {
      deviceId,
      status,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error broadcasting device status:', error);
  }
};

// @desc    Handle device alerts
// @param   io - Socket.IO server instance
// @param   deviceId - Device ID
// @param   alert - Alert data
const broadcastDeviceAlert = (io, deviceId, alert) => {
  try {
    io.to(`device_metrics_${deviceId}`).emit('device_alert', {
      deviceId,
      ...alert,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error broadcasting device alert:', error);
  }
};

// @desc    Get device metrics history for a specific time range
// @param   deviceId - Device ID
// @param   timeRange - Time range (1h, 6h, 24h, 7d, 30d)
const getDeviceMetricsHistory = async (deviceId, timeRange = '24h') => {
  try {
    // Calculate time range
    let startTime;
    switch (timeRange) {
      case '1h':
        startTime = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(Date.now() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const metrics = await MonitoringLog.find({
      deviceId,
      timestamp: { $gte: startTime }
    }).sort({ timestamp: 1 });

    return metrics.map(log => ({
      timestamp: log.timestamp,
      cpuUsage: log.metrics?.cpuUsage || 0,
      memoryUsage: log.metrics?.memoryUsage || 0,
      responseTime: log.metrics?.responseTime || 0,
      interfaces: log.metrics?.interfaces || [],
      status: log.status
    }));
  } catch (error) {
    console.error('Error getting device metrics history:', error);
    throw error;
  }
};

// @desc    Handle real-time metrics request
// @param   socket - Socket.IO socket instance
// @param   deviceId - Device ID
// @param   timeRange - Time range for historical data
const handleRealTimeMetricsRequest = async (socket, deviceId, timeRange = '24h') => {
  try {
    // Get historical data
    const history = await getDeviceMetricsHistory(deviceId, timeRange);
    
    // Get latest metrics
    const latestLog = await MonitoringLog.findOne({ deviceId })
      .sort({ timestamp: -1 });

    socket.emit('real_time_metrics', {
      deviceId,
      history,
      latest: latestLog ? {
        timestamp: latestLog.timestamp,
        ...latestLog.metrics
      } : null,
      timeRange
    });
  } catch (error) {
    console.error('Error handling real-time metrics request:', error);
    socket.emit('error', {
      message: 'Failed to get real-time metrics',
      error: error.message
    });
  }
};

module.exports = {
  handleDeviceMetrics,
  handleDeviceMetricsUnsubscription,
  broadcastDeviceMetrics,
  broadcastDeviceStatus,
  broadcastDeviceAlert,
  getDeviceMetricsHistory,
  handleRealTimeMetricsRequest
}; 