/**
 * Database Backup Script
 * Automatically creates backups of the SQLite database and critical files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../utils/logger');

// Configuration
const config = {
  backupDir: path.join(__dirname, '../../backups'),
  dbPath: path.join(__dirname, '../../database.sqlite'),
  exportDir: path.join(__dirname, '../../public/exports'),
  shippingDir: path.join(__dirname, '../../public/shipping'),
  retentionDays: 7, // How many days of backups to keep
};

/**
 * Create a database backup
 */
async function createDatabaseBackup() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(config.backupDir, `database-${timestamp}.sqlite`);
    
    // Copy the database file
    fs.copyFileSync(config.dbPath, backupFile);
    
    logger.info(`Database backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    logger.error('Database backup failed:', error);
    throw error;
  }
}

/**
 * Create an archive of important files
 */
async function backupImportantFiles() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `files-backup-${timestamp}.tar.gz`;
    const archivePath = path.join(config.backupDir, archiveName);
    
    // Create tar.gz archive of important directories
    execSync(`tar -czf ${archivePath} -C ${path.dirname(config.exportDir)} exports shipping`);
    
    logger.info(`Files backup created: ${archivePath}`);
    return archivePath;
  } catch (error) {
    logger.error('Files backup failed:', error);
    throw error;
  }
}

/**
 * Remove backups older than retention period
 */
async function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(config.backupDir);
    const now = new Date();
    
    files.forEach(file => {
      const filePath = path.join(config.backupDir, file);
      const stats = fs.statSync(filePath);
      const fileDate = new Date(stats.mtime);
      const diffDays = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays > config.retentionDays) {
        fs.unlinkSync(filePath);
        logger.info(`Removed old backup: ${filePath}`);
      }
    });
  } catch (error) {
    logger.error('Backup cleanup failed:', error);
  }
}

/**
 * Run the full backup process
 */
async function runBackup() {
  try {
    logger.info('Starting backup process...');
    await createDatabaseBackup();
    await backupImportantFiles();
    await cleanupOldBackups();
    logger.info('Backup process completed successfully.');
  } catch (error) {
    logger.error('Backup process failed:', error);
  }
}

// If run directly via node
if (require.main === module) {
  runBackup();
}

module.exports = {
  runBackup,
  createDatabaseBackup,
  backupImportantFiles,
  cleanupOldBackups,
};