const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: 'admin@mikrotik.local' },
        { username: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('❌ Admin user already exists!');
      console.log('User details:', {
        username: existingAdmin.username,
        email: existingAdmin.email,
        role: existingAdmin.role,
        createdAt: existingAdmin.createdAt
      });
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@mikrotik.local',
      password: 'admin123', // Will be hashed automatically by pre-save middleware
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true
    });

    await adminUser.save();

    console.log('🎉 Admin user created successfully!');
    console.log('Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username/Email: admin or admin@mikrotik.local');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('You can now login to the application using these credentials.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.log('Duplicate key error - user already exists');
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Also create a regular user for testing
const createTestUser = async () => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: 'user@mikrotik.local' },
        { username: 'testuser' }
      ]
    });

    if (existingUser) {
      console.log('Test user already exists');
      return;
    }

    // Create test user
    const testUser = new User({
      username: 'testuser',
      email: 'user@mikrotik.local',
      password: 'user123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true
    });

    await testUser.save();

    console.log('');
    console.log('🧪 Test user created successfully!');
    console.log('Test user credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username/Email: testuser or user@mikrotik.local');
    console.log('Password: user123');
    console.log('Role: user');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('Error creating test user:', error.message);
  }
};

const seedUsers = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await createAdminUser();
    await createTestUser();

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  console.log('🚀 Creating admin and test users...');
  console.log('');
  seedUsers();
}

module.exports = { createAdminUser, createTestUser };
