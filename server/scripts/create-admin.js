#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');
const User = require('../models/User');

async function createAdminUser(
  username,
  email,
  password,
  fullName = 'Administrator'
) {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        $or: [{ username: username }, { email: email }]
      }
    });

    if (existingUser) {
      console.log(
        `❌ User with username "${username}" or email "${email}" already exists`
      );
      return false;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('✅ Password hashed successfully');

    // Create admin user
    const adminUser = await User.create({
      id: uuidv4(),
      username: username,
      email: email,
      password: hashedPassword,
      fullName: fullName,
      role: 'admin',
      isActive: true,
      emailVerified: true,
      twoFactorEnabled: false,
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      tenantId: uuidv4(),
      onboardingCompleted: true,
      onboardingStep: 10,
      preferences: {},
      monthlyApiCalls: 0,
      monthlyApiLimit: 100000,
      lastApiCallReset: new Date(),
      featuresEnabled: {
        analytics: true,
        inventory_management: true,
        multi_platform: true,
        ai_insights: true,
        custom_reports: true,
        api_access: true
      },
      companyName: 'Pazar+ Admin',
      businessType: 'enterprise',
      monthlyRevenue: '500k+',
      healthScore: 1.0,
      lastActivityAt: new Date(),
      billingCurrency: 'TRY',
      billingCountry: 'TR',
      settings: '{}'
    });

    console.log('✅ Admin user created successfully!');
    console.log('📋 User Details:');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser.id}`);

    return true;
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
}

async function listAdminUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const adminUsers = await User.findAll({
      where: { role: 'admin' },
      attributes: [
        'id',
        'username',
        'email',
        'fullName',
        'isActive',
        'createdAt'
      ]
    });

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found');
      return;
    }

    console.log('📋 Admin Users:');
    console.log('=====================================');
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName || user.username}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.createdAt.toISOString().split('T')[0]}`);
      console.log(`   ID: ${user.id}`);
      console.log('-------------------------------------');
    });
  } catch (error) {
    console.error('❌ Error listing admin users:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
case 'create':
  if (args.length < 4) {
    console.log(
      'Usage: node create-admin.js create <username> <email> <password> [fullName]'
    );
    process.exit(1);
  }
  createAdminUser(args[1], args[2], args[3], args[4]);
  break;

case 'list':
  listAdminUsers();
  break;

default:
  console.log('🔧 Admin User Management Tool');
  console.log('=============================');
  console.log('');
  console.log('Available commands:');
  console.log(
    '  list                                  - List all admin users'
  );
  console.log(
    '  create <username> <email> <password>  - Create new admin user'
  );
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/create-admin.js list');
  console.log(
    '  node scripts/create-admin.js create admin2 admin2@pazar-plus.com mypassword123'
  );
  console.log('');
  console.log('Default admin user credentials (if seeded):');
  console.log('  Username: admin');
  console.log('  Email: admin@pazar-plus.com');
  console.log('  Password: admin123');
  break;
}
