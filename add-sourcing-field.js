#!/usr/bin/env node

/**
 * Add sourcing field to Product and MainProduct tables
 */

const { sequelize } = require("./server/models");

async function addSourcingField() {
  console.log("🔄 Starting to add sourcing field to database tables...");

  try {
    // Add sourcing field to products table
    console.log("📝 Adding sourcing field to products table...");
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS sourcing VARCHAR(20) 
      CHECK (sourcing IN ('local', 'outsource'))
    `);

    // Add sourcing field to main_products table
    console.log("📝 Adding sourcing field to main_products table...");
    await sequelize.query(`
      ALTER TABLE main_products 
      ADD COLUMN IF NOT EXISTS sourcing VARCHAR(20) 
      CHECK (sourcing IN ('local', 'outsource'))
    `);

    console.log("✅ Successfully added sourcing field to both tables!");

    // Show current table schema for verification
    console.log("\n📊 Current products table schema:");
    const [productsSchema] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'sourcing'
    `);
    console.log(productsSchema);

    console.log("\n📊 Current main_products table schema:");
    const [mainProductsSchema] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'main_products' AND column_name = 'sourcing'
    `);
    console.log(mainProductsSchema);
  } catch (error) {
    console.error("❌ Error adding sourcing field:", error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addSourcingField()
    .then(() => {
      console.log("\n🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { addSourcingField };
