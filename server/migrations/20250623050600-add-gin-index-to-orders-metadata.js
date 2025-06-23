module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log(
      "Starting migration: Add GIN index to metadata column in orders table"
    );

    try {
      // Check if metadata column exists and what type it is
      const [metadataColumns] = await queryInterface.sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'metadata';
      `);

      if (metadataColumns.length > 0) {
        const metadataType = metadataColumns[0].data_type;
        console.log(`Metadata column type: ${metadataType}`);

        // If it's JSON or JSONB, create an appropriate GIN index
        if (metadataType === "json" || metadataType === "jsonb") {
          console.log(
            `Creating GIN index on ${metadataType} metadata column...`
          );

          // Drop existing index if it exists
          await queryInterface.sequelize
            .query(
              `
            DROP INDEX IF EXISTS orders_metadata_idx;
          `
            )
            .catch((e) => console.log("No index to drop:", e.message));

          // Create GIN index with proper operator class
          await queryInterface.sequelize
            .query(
              `
            CREATE INDEX orders_metadata_gin_idx ON orders USING GIN ((metadata::jsonb));
          `
            )
            .catch((error) => {
              console.error("Failed to create GIN index:", error.message);
            });
        } else {
          console.log(
            `Metadata column is type ${metadataType}, not JSON or JSONB. Cannot create GIN index.`
          );
        }
      } else {
        console.log("No metadata column found in orders table");
      }
    } catch (error) {
      console.error("Error in migration:", error);
      throw error;
    }

    console.log(
      "Finished migration: Added GIN index to metadata column in orders table"
    );
  },

  down: async (queryInterface, Sequelize) => {
    console.log(
      "Starting rollback: Remove GIN index from metadata column in orders table"
    );

    try {
      // Drop the GIN index
      await queryInterface.sequelize
        .query(
          `
        DROP INDEX IF EXISTS orders_metadata_gin_idx;
      `
        )
        .catch((e) => console.log("Failed to drop index:", e.message));
    } catch (error) {
      console.error("Error in rollback:", error);
      throw error;
    }

    console.log(
      "Finished rollback: Removed GIN index from metadata column in orders table"
    );
  },
};
