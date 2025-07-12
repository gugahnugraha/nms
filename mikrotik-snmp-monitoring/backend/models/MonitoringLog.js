const mongoose = require('mongoose');

const monitoringLogSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    required: true
  },
  responseTime: {
    type: Number, // milliseconds
    min: [0, 'Response time cannot be negative']
  },
  cpuUsage: {
    type: Number, // percentage
    min: [0, 'CPU usage cannot be negative'],
    max: [100, 'CPU usage cannot exceed 100%']
  },
  memoryUsage: {
    type: Number, // percentage
    min: [0, 'Memory usage cannot be negative'],
    max: [100, 'Memory usage cannot exceed 100%']
  },
  diskUsage: {
    type: Number, // percentage
    min: [0, 'Disk usage cannot be negative'],
    max: [100, 'Disk usage cannot exceed 100%']
  },
  interfaceStats: [{
    interfaceName: String,
    bytesIn: Number,
    bytesOut: Number,
    packetsIn: Number,
    packetsOut: Number,
    errorsIn: Number,
    errorsOut: Number,
    utilization: Number // percentage
  }],
  temperature: {
    type: Number, // Celsius
    min: [-50, 'Temperature cannot be below -50°C'],
    max: [150, 'Temperature cannot exceed 150°C']
  },
  uptime: {
    type: Number // seconds
  },
  errorMessage: {
    type: String,
    maxlength: [500, 'Error message cannot exceed 500 characters']
  },
  snmpData: {
    type: mongoose.Schema.Types.Mixed // Store raw SNMP data
  }
}, {
  timestamps: true
});

// Index for faster queries
monitoringLogSchema.index({ device: 1, timestamp: -1 });
monitoringLogSchema.index({ status: 1 });
monitoringLogSchema.index({ timestamp: -1 });

// TTL index to automatically delete old logs (optional - keep 30 days)
monitoringLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = mongoose.model('MonitoringLog', monitoringLogSchema);
