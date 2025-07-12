// Simple admin user creator
console.log('🚀 Creating admin user...');

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Direct MongoDB connection
const MONGODB_URI = 'mongodb+srv://gugahnugraha8:kaseppisan@cluster0.n4lat.mongodb.net/nms3?retryWrites=true&w=majority&appName=Cluster0';

// User schema (simplified)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');

    // Check if admin exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('❌ Admin already exists!');
      console.log(`Username: ${existingAdmin.username}`);
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
    } else {
      // Create admin
      const admin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin'
      });

      await admin.save();
      
      console.log('🎉 Admin user created!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('LOGIN CREDENTIALS:');
      console.log('Username: admin');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
      console.log('Role: admin');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // Create test user if not exists
    const existingUser = await User.findOne({ username: 'testuser' });
    
    if (!existingUser) {
      const testUser = new User({
        username: 'testuser',
        email: 'user@example.com',
        password: 'user123',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      });

      await testUser.save();
      
      console.log('');
      console.log('🧪 Test user created!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('TEST USER CREDENTIALS:');
      console.log('Username: testuser');
      console.log('Email: user@example.com');
      console.log('Password: user123');
      console.log('Role: user');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('✅ Done!');
  }
}

main();
