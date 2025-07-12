const mongoose = require('mongoose');
const User = require('../models/User');

// Load environment variables
require('dotenv').config();

async function createAdmin() {
  try {
    console.log('🚀 Starting user creation process...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('❌ Admin user already exists!');
      console.log('Admin user details:');
      console.log(`  - Username: ${existingAdmin.username}`);
      console.log(`  - Email: ${existingAdmin.email}`);
      console.log(`  - Role: ${existingAdmin.role}`);
      console.log(`  - Created: ${existingAdmin.createdAt}`);
    } else {
      // Create admin user
      console.log('Creating admin user...');
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@mikrotik.local',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true
      });

      console.log('🎉 Admin user created successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('LOGIN CREDENTIALS:');
      console.log('Username: admin');
      console.log('Email: admin@mikrotik.local');
      console.log('Password: admin123');
      console.log('Role: admin');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // Also check/create test user
    const existingUser = await User.findOne({ username: 'testuser' });
    
    if (!existingUser) {
      const testUser = await User.create({
        username: 'testuser',
        email: 'user@mikrotik.local',
        password: 'user123',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true
      });

      console.log('');
      console.log('🧪 Test user created successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('TEST USER CREDENTIALS:');
      console.log('Username: testuser');
      console.log('Email: user@mikrotik.local');
      console.log('Password: user123');
      console.log('Role: user');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('Test user already exists');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    console.log('');
    console.log('Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Done!');
    process.exit(0);
  }
}

// Run the function
createAdmin();
