const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// Create admin user
const createAdmin = async () => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'securepassword123', // will be hashed by pre-save hook
      role: 'admin',
      isEmailVerified: true // admin is pre-verified
    });
    
    console.log('Admin user created successfully');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Run the function
createAdmin();
