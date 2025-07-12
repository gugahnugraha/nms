/**
 * Migration script to add device IDs to existing devices
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/database');
const Device = require('../models/Device');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Device ID mapping for existing devices
const DEVICE_ID_MAPPING = {
  'Diskominfo': '00',
  'Katapang': '11',
  'cangkuang': '44',
  'Banjaran': '13',
  'Ciwidey': '39',
  'Rancaekek': '28'
};

async function migrateDeviceIds() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');
    
    // Get all devices
    const devices = await Device.find({});
    console.log(`Found ${devices.length} devices to process`);
    
    // Check if any devices need updating
    const devicesNeedingIds = devices.filter(device => !device.deviceId);
    
    if (devicesNeedingIds.length === 0) {
      console.log('All devices already have IDs. No migration needed.');
      return;
    }
    
    console.log(`${devicesNeedingIds.length} devices need to be updated with IDs`);
    
    let updated = 0;
    let skipped = 0;
    
    // Update each device
    for (const device of devices) {
      // Check if device already has an ID
      if (device.deviceId) {
        console.log(`Device ${device.name} already has ID: ${device.deviceId} - skipping`);
        skipped++;
        continue;
      }
      
      // Check if we have a predefined ID for this device
      const deviceId = DEVICE_ID_MAPPING[device.name];
      
      if (deviceId) {
        console.log(`Updating device ${device.name} with ID: ${deviceId}`);
        device.deviceId = deviceId;
        await device.save();
        updated++;
      } else {
        // Generate a random 2-digit ID for devices not in our mapping
        const randomId = Math.floor(Math.random() * 90 + 10).toString();
        console.log(`Assigning random ID ${randomId} to device ${device.name}`);
        device.deviceId = randomId;
        await device.save();
        updated++;
      }
    }
    
    console.log(`Migration complete: ${updated} devices updated, ${skipped} devices skipped`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the migration
migrateDeviceIds();
