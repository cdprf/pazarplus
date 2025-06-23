const sequelize = require('./server/config/database');

async function verifyOrdersTable() {
  try {
    console.log('Verifying orders table...');
    
    // 1. Check if the 'orders' table exists
    const [tableResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `);
    
    if (tableResults[0].exists) {
      console.log('✅ Table "orders" exists');
    } else {
      console.error('❌ Table "orders" does not exist!');
      return;
    }
    
    // 2. Check if the 'Orders' view exists
    const [viewResults] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'Orders'
      );
    `);
    
    if (viewResults[0].exists) {
      console.log('✅ View "Orders" exists');
    } else {
      console.log('⚠️ View "Orders" does not exist. Creating it...');
      
      try {
        await sequelize.query(`
          CREATE OR REPLACE VIEW "Orders" AS
          SELECT * FROM orders;
        `);
        console.log('✅ View "Orders" created successfully');
      } catch (error) {
        console.error('❌ Failed to create "Orders" view:', error.message);
      }
    }
    
    // 3. Check for required columns
    const [columnsResults] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders'
      AND column_name IN ('errorMessage', 'retryCount', 'metadata');
    `);
    
    const columnMap = columnsResults.reduce((acc, col) => {
      acc[col.column_name] = col.data_type;
      return acc;
    }, {});
    
    // Check errorMessage column
    if (columnMap.errorMessage) {
      console.log(`✅ Column "errorMessage" exists with type: ${columnMap.errorMessage}`);
    } else {
      console.error('❌ Column "errorMessage" does not exist!');
    }
    
    // Check retryCount column
    if (columnMap.retryCount) {
      console.log(`✅ Column "retryCount" exists with type: ${columnMap.retryCount}`);
    } else {
      console.error('❌ Column "retryCount" does not exist!');
    }
    
    // Check metadata column
    if (columnMap.metadata) {
      console.log(`✅ Column "metadata" exists with type: ${columnMap.metadata}`);
      
      // Recommend JSONB conversion if it's TEXT
      if (columnMap.metadata === 'text') {
        console.log('⚠️ Column "metadata" is TEXT type. Consider converting to JSONB for better performance.');
      }
    } else {
      console.error('❌ Column "metadata" does not exist!');
    }
    
    // 4. Test querying through the Orders view
    try {
      const [viewQueryResult] = await sequelize.query(`SELECT COUNT(*) FROM "Orders";`);
      console.log(`✅ Successfully queried "Orders" view. Count: ${viewQueryResult[0].count}`);
    } catch (error) {
      console.error('❌ Failed to query "Orders" view:', error.message);
    }
    
    // 5. Check indexes
    const [indexesResults] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'orders'
      AND indexname IN ('orders_error_message_idx', 'orders_retry_count_idx', 'orders_metadata_idx', 'orders_metadata_gin_idx');
    `);
    
    const indexMap = indexesResults.reduce((acc, idx) => {
      acc[idx.indexname] = idx.indexdef;
      return acc;
    }, {});
    
    // Check errorMessage index
    if (indexMap.orders_error_message_idx) {
      console.log(`✅ Index "orders_error_message_idx" exists: ${indexMap.orders_error_message_idx}`);
    } else {
      console.log('⚠️ Index "orders_error_message_idx" does not exist.');
    }
    
    // Check retryCount index
    if (indexMap.orders_retry_count_idx) {
      console.log(`✅ Index "orders_retry_count_idx" exists: ${indexMap.orders_retry_count_idx}`);
    } else {
      console.log('⚠️ Index "orders_retry_count_idx" does not exist.');
    }
    
    // Check metadata index
    if (indexMap.orders_metadata_idx) {
      console.log(`✅ Index "orders_metadata_idx" exists: ${indexMap.orders_metadata_idx}`);
    } else {
      console.log('⚠️ Index "orders_metadata_idx" does not exist.');
    }
    
    // Check metadata GIN index
    if (indexMap.orders_metadata_gin_idx) {
      console.log(`✅ Index "orders_metadata_gin_idx" exists: ${indexMap.orders_metadata_gin_idx}`);
    } else {
      console.log('⚠️ Index "orders_metadata_gin_idx" does not exist.');
    }
    
  } catch (error) {
    console.error('Error verifying orders table:', error);
  } finally {
    await sequelize.close();
  }
}

verifyOrdersTable();
