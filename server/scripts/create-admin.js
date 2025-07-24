#!/usr/bin/env node
const logger = require("../utils/logger");

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
    logger.info('✅ Database connection established');

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        $or: [{ username: username }, { email: email }]
      }
    });

    if (existingUser) {
      logger.info(
        `❌ User with username "${username}" or email "${email}" already exists`
      );
      return false;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    logger.info('✅ Password hashed successfully');

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

    logger.info('✅ Admin user created successfully!');
    logger.info('📋 User Details:');
    logger.info(`   Username: ${username}`);
    logger.info(`   Email: ${email}`);
    logger.info(`   Password: ${password}`);
    logger.info(`   Role: ${adminUser.role}`);
    logger.info(`   ID: ${adminUser.id}`);

    return true;
  } catch (error) {
    logger.error('❌ Error creating admin user:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
}

async function listAdminUsers() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

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
      logger.info('❌ No admin users found');
      return;
    }

    logger.info('📋 Admin Users:');
    logger.info('=====================================');
    adminUsers.forEach((user, index) => {
      logger.info(`${index + 1}. ${user.fullName || user.username}`);
      logger.info(`   Username: ${user.username}`);
      logger.info(`   Email: ${user.email}`);
      logger.info(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
      logger.info(`   Created: ${user.createdAt.toISOString().split('T')[0]}`);
      logger.info(`   ID: ${user.id}`);
      logger.info('-------------------------------------');
    });
  } catch (error) {
    logger.error('❌ Error listing admin users:', error.message);
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
    logger.info(
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
  logger.info('🔧 Admin User Management Tool');
  logger.info('=============================');
  logger.info('');
  logger.info('Available commands:');
  logger.info(
    '  list                                  - List all admin users'
  );
  logger.info(
    '  create <username> <email> <password>  - Create new admin user'
  );
  logger.info('');
  logger.info('Examples:');
  logger.info('  node scripts/create-admin.js list');
  logger.info(
    '  node scripts/create-admin.js create admin2 admin2@pazar-plus.com mypassword123'
  );
  logger.info('');
  logger.info('Default admin user credentials (if seeded):');
  logger.info('  Username: admin');
  logger.info('  Email: admin@pazar-plus.com');
  logger.info('  Password: admin123');
  break;
}
