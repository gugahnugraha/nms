/**
 * Migration script to enable autoCollect for existing devices
 * 
 * Run this with: node enableAutoCollect.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Device = require('./models/Device');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Print MongoDB URI (without the actual password for security)
const dbUri = process.env.MONGODB_URI;
if (!dbUri) {
  console.error('MONGODB_URI environment variable is not set!');
  process.exit(1);
}

const maskedUri = dbUri.replace(/:([^:@]+)@/, ':********@');
console.log(`Will connect to MongoDB: ${maskedUri}`);

// Connect to database using the same configuration as the main app
connectDB()
  .then(() => {
    // Run the migration after successful connection
    enableAutoCollect();
  })
  .catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

const enableAutoCollect = async () => {
  try {
    console.log('Starting migration: Enabling autoCollect for existing devices...');
    console.log('Checking database connection...');
    
    // Find all devices with autoCollect set to false
    console.log('Querying devices with autoCollect disabled...');
    const devices = await Device.find({ autoCollect: false });
    
    console.log(`Found ${devices.length} devices with autoCollect disabled`);
    
    if (devices.length === 0) {
      console.log('No devices to update. All devices already have autoCollect enabled.');
      process.exit(0);
    }
    
    // Update all devices
    console.log('Updating devices...');
    const result = await Device.updateMany(
      { autoCollect: false },
      { $set: { autoCollect: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} devices to enable autoCollect`);
    console.log('Migration completed successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};
