/**
 * Script to restore the required field for deviceId after migration
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

async function restoreSchema() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');
    
    // Path to the Device model file
    const deviceModelPath = path.resolve(__dirname, 'models/Device.js');
    
    // Read the current content
    const content = fs.readFileSync(deviceModelPath, 'utf8');
    
    // Replace the temporary schema with the permanent one
    const updatedContent = content.replace(
      `  deviceId: {
    type: String,
    trim: true,
    maxlength: [10, 'Device ID cannot exceed 10 characters'],
    sparse: true,
    unique: true,
    index: true
    // required field temporarily removed for migration
  },`,
      `  deviceId: {
    type: String,
    trim: true,
    maxlength: [10, 'Device ID cannot exceed 10 characters'],
    unique: true,
    index: true,
    required: [true, 'Device ID is required']
  },`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(deviceModelPath, updatedContent, 'utf8');
    
    console.log('Device schema updated successfully. deviceId is now required.');
    
  } catch (error) {
    console.error('Failed to restore schema:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the schema restoration
restoreSchema();
