'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Check if admin user already exists
    const [existingUser] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE username = \'admin\' OR email = \'admin@pazar-plus.com\'',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!existingUser) {
      await queryInterface.bulkInsert(
        'users',
        [
          {
            id: uuidv4(),
            username: 'admin',
            email: 'admin@pazar-plus.com',
            password: hashedPassword,
            fullName: 'System Administrator',
            role: 'admin',
            isActive: true,
            emailVerified: true,
            twoFactorEnabled: false,
            subscriptionPlan: 'enterprise',
            subscriptionStatus: 'active',
            tenantId: uuidv4(),
            onboardingCompleted: true,
            onboardingStep: 10,
            preferences: JSON.stringify({}),
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            iyzicoCustomerId: null,
            monthlyApiCalls: 0,
            monthlyApiLimit: 100000,
            lastApiCallReset: new Date(),
            featuresEnabled: JSON.stringify({
              analytics: true,
              inventory_management: true,
              multi_platform: true,
              ai_insights: true,
              custom_reports: true,
              api_access: true
            }),
            companyName: 'Pazar+ Admin',
            businessType: 'enterprise',
            monthlyRevenue: '500k+',
            healthScore: 1.0,
            lastActivityAt: new Date(),
            billingCurrency: 'TRY',
            billingCountry: 'TR',
            settings: '{}',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        {}
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'users',
      {
        username: 'admin'
      },
      {}
    );
  }
};
