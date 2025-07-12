const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    // Configure Mongoose
    mongoose.set('strictQuery', false);
    
    // Connection options with longer timeouts
    const options = {
      serverSelectionTimeoutMS: 30000, // Timeout after 30 seconds
      socketTimeoutMS: 45000,         // Close sockets after 45 seconds
      connectTimeoutMS: 30000,        // Give up initial connection after 30 seconds
      maxPoolSize: 10,                // Maintain up to 10 socket connections
      minPoolSize: 2,                 // Maintain at least 2 socket connections
      family: 4                       // Use IPv4, skip trying IPv6
    };
    
    // Log the connection string (with password masked)
    const dbUri = process.env.MONGODB_URI;
    if (!dbUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    const maskedUri = dbUri.replace(/:([^:@]+)@/, ':********@');
    console.log(`MongoDB URI: ${maskedUri}`);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Set up connection error handlers
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    console.error('Connection details:', error);
    
    // Don't exit the process, let the caller handle it
    throw error;
  }
};

module.exports = connectDB;
