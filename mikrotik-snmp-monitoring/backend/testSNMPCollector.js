/**
 * Test script to verify SNMP collector functionality
 * This script will start a collector for a specific device and run it for a short time
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const Device = require('./models/Device');
const { startDeviceCollector } = require('./controllers/snmpExporterController');

// Load environment variables
dotenv.config();

// Connect to database
async function testSNMPCollector() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    // Find a device to test
    const device = await Device.findOne({ autoCollect: true });
    
    if (!device) {
      console.error('No device with autoCollect enabled found. Please add a device or enable autoCollect on an existing device.');
      process.exit(1);
    }
    
    console.log(`Testing SNMP collector for device: ${device.name} (${device.ip})`);
    
    // Start the collector
    const result = await new Promise((resolve, reject) => {
      startDeviceCollector(device._id, (err, collector) => {
        if (err) {
          return reject(err);
        }
        
        console.log('Collector started successfully');
        console.log('Waiting for collection to complete (10 seconds)...');
        
        // Stop the collector after 10 seconds
        setTimeout(() => {
          try {
            collector.stop();
            console.log('Collector stopped');
            resolve({ success: true });
          } catch (stopError) {
            console.error('Error stopping collector:', stopError);
            reject(stopError);
          }
        }, 10000);
      });
    });
    
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the test
testSNMPCollector();
