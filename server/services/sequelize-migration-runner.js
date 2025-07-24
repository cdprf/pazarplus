const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

/**
 * Sequelize Migration Runner
 * Executes migration files from the migrations directory
 */
class SequelizeMigrationRunner {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.migrationsPath = path.join(__dirname, '../migrations');
    this.logger =
      process.env.NODE_ENV === 'production'
        ? require('../utils/logger-simple')
        : require('../utils/logger');
  }

  /**
   * Create SequelizeMeta table if it doesn't exist
   */
  async createMetaTable() {
    const queryInterface = this.sequelize.getQueryInterface();

    try {
      // Check if SequelizeMeta table exists
      const tableExists = await this.tableExists('SequelizeMeta');

      if (!tableExists) {
        await queryInterface.createTable('SequelizeMeta', {
          name: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            primaryKey: true
          }
        });
        this.logger.info('Created SequelizeMeta table for tracking migrations');
      }
    } catch (error) {
      this.logger.warn('Error creating SequelizeMeta table:', error.message);
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName) {
    try {
      // Handle different database dialects
      const dialect = this.sequelize.getDialect();

      if (dialect === 'postgres') {
        const [results] = await this.sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          );
        `);
        return results[0].exists;
      } else if (dialect === 'sqlite') {
        const [results] = await this.sequelize.query(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='${tableName}';
        `);
        return results.length > 0;
      }

      return false;
    } catch (error) {
      this.logger.warn(
        `Error checking if table ${tableName} exists:`,
        error.message
      );
      return false;
    }
  }

  /**
   * Get list of migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files.filter((file) => file.endsWith('.js')).sort(); // Sort to ensure proper execution order
    } catch (error) {
      this.logger.error('Error reading migrations directory:', error.message);
      return [];
    }
  }

  /**
   * Check which migrations have already been run
   */
  async getExecutedMigrations() {
    try {
      // Handle both production mock database and real database
      if (
        this.sequelize.getDialect() === 'sqlite' &&
        this.sequelize.config?.storage === ':memory:'
      ) {
        this.logger.info(
          'Using in-memory database, no migration tracking available'
        );
        return [];
      }

      const [results] = await this.sequelize.query(
        'SELECT name FROM "SequelizeMeta" ORDER BY name'
      );
      return results.map((row) => row.name);
    } catch (error) {
      this.logger.warn('Error getting executed migrations:', error.message);
      return [];
    }
  }

  /**
   * Mark migration as executed
   */
  async markMigrationExecuted(migrationName) {
    try {
      // Skip marking for in-memory databases
      if (
        this.sequelize.getDialect() === 'sqlite' &&
        this.sequelize.config?.storage === ':memory:'
      ) {
        return;
      }

      await this.sequelize.query(
        'INSERT INTO "SequelizeMeta" (name) VALUES (?)',
        {
          replacements: [migrationName],
          type: Sequelize.QueryTypes.INSERT
        }
      );
    } catch (error) {
      // Ignore duplicate key errors (migration already marked as executed)
      if (error.name === 'SequelizeUniqueConstraintError') {
        this.logger.info(
          `Migration ${migrationName} already marked as executed`
        );
        return;
      }
      this.logger.warn(
        `Error marking migration ${migrationName} as executed:`,
        error.message
      );
    }
  }

  /**
   * Execute a single migration file
   */
  async executeMigration(migrationFile) {
    const migrationPath = path.join(this.migrationsPath, migrationFile);

    try {
      this.logger.info(`Executing migration: ${migrationFile}`);

      // Load the migration module
      delete require.cache[require.resolve(migrationPath)];
      const migration = require(migrationPath);

      // Execute the migration
      const queryInterface = this.sequelize.getQueryInterface();
      await migration.up(queryInterface, Sequelize);

      // Mark as executed
      await this.markMigrationExecuted(migrationFile);

      this.logger.info(`✅ Migration completed: ${migrationFile}`);
      return true;
    } catch (error) {
      // Check if error is due to table already existing
      if (
        error.name === 'SequelizeDatabaseError' &&
        (error.original?.code === '42P07' ||
          error.message.includes('already exists'))
      ) {
        this.logger.info(
          `⏭️  Migration skipped (table already exists): ${migrationFile}`
        );
        // Still mark as executed to avoid running again
        await this.markMigrationExecuted(migrationFile);
        return true;
      }

      this.logger.error(`❌ Migration failed: ${migrationFile}`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      this.logger.info('Starting database migrations...');

      // Ensure meta table exists
      await this.createMetaTable();

      // Get all migration files
      const migrationFiles = await this.getMigrationFiles();
      if (migrationFiles.length === 0) {
        this.logger.info('No migration files found');
        return true;
      }

      // Get already executed migrations
      const executedMigrations = await this.getExecutedMigrations();

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        (file) => !executedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        this.logger.info('All migrations are up to date');
        return true;
      }

      this.logger.info(`Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations in order
      let successCount = 0;
      for (const migrationFile of pendingMigrations) {
        await this.executeMigration(migrationFile);
        successCount++;
      }

      this.logger.info(
        `🎉 Database migrations completed! ${successCount}/${pendingMigrations.length} migrations executed successfully.`
      );
      return true;
    } catch (error) {
      this.logger.error('Database migrations failed:', error);
      throw error;
    }
  }

  /**
   * Check if comprehensive migration exists and prioritize it
   */
  async runComprehensiveMigration() {
    const comprehensiveMigrationFile =
      '20250621000001-create-all-tables-complete.js';
    const migrationFiles = await this.getMigrationFiles();

    if (migrationFiles.includes(comprehensiveMigrationFile)) {
      const executedMigrations = await this.getExecutedMigrations();

      if (!executedMigrations.includes(comprehensiveMigrationFile)) {
        this.logger.info(
          `Running comprehensive migration: ${comprehensiveMigrationFile}`
        );
        await this.executeMigration(comprehensiveMigrationFile);
        return true;
      } else {
        this.logger.info(
          `Comprehensive migration already executed: ${comprehensiveMigrationFile}`
        );
        return true;
      }
    }

    return false;
  }
}

module.exports = SequelizeMigrationRunner;
