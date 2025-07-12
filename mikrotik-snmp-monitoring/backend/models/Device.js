const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    trim: true,
    maxlength: [10, 'Device ID cannot exceed 10 characters'],
    sparse: true,
    unique: true,
    index: true
    // required field temporarily removed for migration
  },
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    maxlength: [100, 'Device name cannot exceed 100 characters']
  },
  ipAddress: {
    type: String,
    required: [true, 'IP Address is required'],
    trim: true,
    match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Please enter a valid IP address']
  },
  snmpCommunity: {
    type: String,
    required: [true, 'SNMP Community is required'],
    default: 'public'
  },
  snmpVersion: {
    type: String,
    enum: ['1', '2c', '3'],
    default: '2c'
  },
  snmpPort: {
    type: Number,
    default: 161,
    min: [1, 'Port must be greater than 0'],
    max: [65535, 'Port must be less than 65536']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  deviceType: {
    type: String,
    enum: ['router', 'switch', 'access-point', 'bridge', 'server', 'pc', 'other'],
    default: 'router'
  },
  model: {
    type: String,
    trim: true,
    maxlength: [100, 'Model cannot exceed 100 characters']
  },
  serialNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Serial number cannot exceed 100 characters']
  },
  firmwareVersion: {
    type: String,
    trim: true,
    maxlength: [50, 'Firmware version cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'unknown'],
    default: 'unknown'
  },
  lastSeen: {
    type: Date
  },  pingInterval: {
    type: Number,
    default: 60, // seconds
    min: [10, 'Ping interval must be at least 10 seconds'],
    max: [3600, 'Ping interval cannot exceed 1 hour']
  },
  snmpInterval: {
    type: Number,
    default: 300, // seconds
    min: [30, 'SNMP interval must be at least 30 seconds'],
    max: [3600, 'SNMP interval cannot exceed 1 hour']
  },
  snmpTimeout: {
    type: Number,
    default: 5000, // milliseconds
    min: [1000, 'SNMP timeout must be at least 1 second'],
    max: [30000, 'SNMP timeout cannot exceed 30 seconds']
  },
  autoCollect: {
    type: Boolean,
    default: true,
    description: 'Whether to automatically collect metrics using SNMP Exporter'
  },
  collectInterval: {
    type: String,
    enum: ['fast', 'standard', 'slow', 'custom'],
    default: 'standard',
    description: 'Interval for automatic metric collection'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }]
}, {
  timestamps: true
});

// Index for faster queries
deviceSchema.index({ ipAddress: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ isActive: 1 });
deviceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Device', deviceSchema);
