"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log("🔄 Updating creation_source_enum to include new values...");

      // Add new enum values to existing enum
      await queryInterface.sequelize.query(`
        ALTER TYPE creation_source_enum ADD VALUE IF NOT EXISTS 'platform';
      `);

      await queryInterface.sequelize.query(`
        ALTER TYPE creation_source_enum ADD VALUE IF NOT EXISTS 'legacy';
      `);

      // Update existing data: platform_sync -> platform
      console.log("🔄 Updating existing platform_sync values to platform...");

      // Update products table
      await queryInterface.sequelize.query(`
        UPDATE products 
        SET "creationSource" = 'platform' 
        WHERE "creationSource" = 'platform_sync';
      `);

      // Update main_products table if it exists
      try {
        await queryInterface.sequelize.query(`
          UPDATE main_products 
          SET "creationSource" = 'platform' 
          WHERE "creationSource" = 'platform_sync';
        `);
      } catch (error) {
        console.log("main_products table not found, skipping...");
      }

      // Update platform_variants table if it exists
      try {
        await queryInterface.sequelize.query(`
          UPDATE platform_variants 
          SET "creationSource" = 'platform' 
          WHERE "creationSource" = 'platform_sync';
        `);
      } catch (error) {
        console.log("platform_variants table not found, skipping...");
      }

      console.log("✅ Successfully updated creation_source_enum values");
    } catch (error) {
      console.error("❌ Error updating creation_source_enum:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      console.log("🔄 Reverting creation_source_enum changes...");

      // Revert data changes: platform -> platform_sync
      await queryInterface.sequelize.query(`
        UPDATE products 
        SET "creationSource" = 'platform_sync' 
        WHERE "creationSource" = 'platform';
      `);

      // Update main_products table if it exists
      try {
        await queryInterface.sequelize.query(`
          UPDATE main_products 
          SET "creationSource" = 'platform_sync' 
          WHERE "creationSource" = 'platform';
        `);
      } catch (error) {
        console.log("main_products table not found, skipping...");
      }

      // Update platform_variants table if it exists
      try {
        await queryInterface.sequelize.query(`
          UPDATE platform_variants 
          SET "creationSource" = 'platform_sync' 
          WHERE "creationSource" = 'platform';
        `);
      } catch (error) {
        console.log("platform_variants table not found, skipping...");
      }

      // Note: Cannot remove enum values in PostgreSQL without recreating the type
      // This would require dropping all dependent columns first
      console.log(
        "⚠️  Note: Enum values cannot be removed without recreating the type"
      );
      console.log("✅ Data reverted to platform_sync values");
    } catch (error) {
      console.error("❌ Error reverting creation_source_enum changes:", error);
      throw error;
    }
  },
};
