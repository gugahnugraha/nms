const mongoose = require('mongoose');
const Device = require('./models/Device');
const MonitoringLog = require('./models/MonitoringLog');
const User = require('./models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const createSampleDevices = async () => {
  try {
    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run seed.js first.');
      return;
    }

    // Clear existing devices and logs
    await Device.deleteMany({});
    await MonitoringLog.deleteMany({});

    // Create sample devices
    const devices = [
      {
        name: 'Main Router',
        ipAddress: '192.168.1.1',
        snmp: {
          community: 'public',
          port: 161,
          version: '2c'
        },
        location: 'Server Room',
        description: 'Main MikroTik router for office network',
        pingInterval: 300,
        snmpInterval: 600,
        status: 'online',
        lastSeen: new Date(),
        createdBy: adminUser._id
      },
      {
        name: 'Access Point - Floor 1',
        ipAddress: '192.168.1.50',
        snmp: {
          community: 'public',
          port: 161,
          version: '2c'
        },
        location: 'First Floor',
        description: 'WiFi access point for first floor',
        pingInterval: 300,
        snmpInterval: 600,
        status: 'online',
        lastSeen: new Date(),
        createdBy: adminUser._id
      },
      {
        name: 'Access Point - Floor 2',
        ipAddress: '192.168.1.51',
        snmp: {
          community: 'public',
          port: 161,
          version: '2c'
        },
        location: 'Second Floor',
        description: 'WiFi access point for second floor',
        pingInterval: 300,
        snmpInterval: 600,
        status: 'offline',
        lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        createdBy: adminUser._id
      },
      {
        name: 'Switch - Department A',
        ipAddress: '192.168.1.100',
        snmp: {
          community: 'public',
          port: 161,
          version: '2c'
        },
        location: 'Department A',
        description: 'Network switch for Department A',
        pingInterval: 300,
        snmpInterval: 600,
        status: 'online',
        lastSeen: new Date(),
        createdBy: adminUser._id
      },
      {
        name: 'Edge Router',
        ipAddress: '192.168.1.2',
        snmp: {
          community: 'public',
          port: 161,
          version: '2c'
        },
        location: 'Data Center',
        description: 'Edge router for external connectivity',
        pingInterval: 300,
        snmpInterval: 600,
        status: 'unknown',
        lastSeen: null,
        createdBy: adminUser._id
      }
    ];

    const createdDevices = await Device.insertMany(devices);
    console.log(`✅ Created ${createdDevices.length} sample devices`);

    // Create sample monitoring logs
    const logs = [];
    const now = new Date();
    
    for (const device of createdDevices) {
      // Generate logs for the last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate hourly logs for each day
        for (let hour = 0; hour < 24; hour++) {
          const logTime = new Date(date);
          logTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
          
          let status = 'online';
          let responseTime = Math.floor(Math.random() * 50) + 10; // 10-60ms
          let cpuUsage = Math.floor(Math.random() * 30) + 10; // 10-40%
          let memoryUsage = Math.floor(Math.random() * 40) + 20; // 20-60%
          let error = null;
          
          // Simulate some offline periods for certain devices
          if (device.name.includes('Floor 2') && Math.random() < 0.3) {
            status = 'offline';
            responseTime = null;
            cpuUsage = null;
            memoryUsage = null;
            error = 'Connection timeout';
          } else if (device.name.includes('Edge Router') && Math.random() < 0.2) {
            status = 'unknown';
            responseTime = null;
            cpuUsage = null;
            memoryUsage = null;
            error = 'SNMP timeout';
          }
          
          // Add some high usage spikes
          if (Math.random() < 0.1) {
            cpuUsage = Math.floor(Math.random() * 20) + 80; // 80-100%
          }
          if (Math.random() < 0.1) {
            memoryUsage = Math.floor(Math.random() * 20) + 80; // 80-100%
          }
          
          logs.push({
            device: device._id,
            timestamp: logTime,
            status,
            responseTime,
            cpuUsage,
            memoryUsage,
            error
          });
        }
      }
    }
    
    await MonitoringLog.insertMany(logs);
    console.log(`✅ Created ${logs.length} sample monitoring logs`);
    
    // Update device statuses based on latest logs
    for (const device of createdDevices) {
      const latestLog = await MonitoringLog.findOne({ device: device._id }).sort({ timestamp: -1 });
      if (latestLog) {
        device.status = latestLog.status;
        device.lastSeen = latestLog.timestamp;
        await device.save();
      }
    }
    
    console.log('✅ Updated device statuses');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
};

const main = async () => {
  await connectDB();
  await createSampleDevices();
  console.log('🎉 Sample data creation completed!');
  process.exit(0);
};

main();
