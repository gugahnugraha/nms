/**
 * Script to test MongoDB connection
 * Run with: node testConnection.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Testing MongoDB connection...');

// Get the MongoDB URI
const dbUri = process.env.MONGODB_URI;
if (!dbUri) {
  console.error('MONGODB_URI environment variable is not defined!');
  process.exit(1);
}

// Mask the password for logging
const maskedUri = dbUri.replace(/:([^:@]+)@/, ':********@');
console.log(`MongoDB URI: ${maskedUri}`);

// Connection options with timeouts
const options = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
};

// Test the connection
mongoose.connect(dbUri, options)
  .then(() => {
    console.log('✅ Connection successful!');
    console.log(`Connected to MongoDB: ${mongoose.connection.host}`);
    console.log(`Database name: ${mongoose.connection.name}`);
    
    // Close the connection after successful test
    return mongoose.connection.close();
  })
  .then(() => {
    console.log('Connection closed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed!');
    console.error('Error details:', err);
    process.exit(1);
  });
