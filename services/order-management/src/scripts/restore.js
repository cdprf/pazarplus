/**
 * Database Restore Script
 * Restores the SQLite database and critical files from backups
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const logger = require('../utils/logger');

// Configuration
const config = {
  backupDir: path.join(__dirname, '../../backups'),
  dbPath: path.join(__dirname, '../../database.sqlite'),
  exportDir: path.join(__dirname, '../../public/exports'),
  shippingDir: path.join(__dirname, '../../public/shipping'),
};

/**
 * List available backups
 */
function listBackups() {
  try {
    if (!fs.existsSync(config.backupDir)) {
      console.log('No backups found. Backup directory does not exist.');
      return [];
    }

    const files = fs.readdirSync(config.backupDir);
    const backups = {
      database: [],
      files: []
    };

    files.forEach(file => {
      if (file.startsWith('database-')) {
        backups.database.push({
          file,
          path: path.join(config.backupDir, file),
          date: new Date(file.replace('database-', '').replace('.sqlite', '').replace(/-/g, ':')).toLocaleString()
        });
      } else if (file.startsWith('files-backup-')) {
        backups.files.push({
          file,
          path: path.join(config.backupDir, file),
          date: new Date(file.replace('files-backup-', '').replace('.tar.gz', '').replace(/-/g, ':')).toLocaleString()
        });
      }
    });

    // Sort by date (newest first)
    backups.database.sort((a, b) => new Date(b.date) - new Date(a.date));
    backups.files.sort((a, b) => new Date(b.date) - new Date(a.date));

    return backups;
  } catch (error) {
    logger.error('Failed to list backups:', error);
    throw error;
  }
}

/**
 * Restore database from backup
 */
async function restoreDatabase(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Database backup file not found: ${backupPath}`);
    }

    // Create backup of current database before restoring
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackup = path.join(config.backupDir, `pre-restore-${timestamp}.sqlite`);
    
    if (fs.existsSync(config.dbPath)) {
      fs.copyFileSync(config.dbPath, currentBackup);
      logger.info(`Created backup of current database before restore: ${currentBackup}`);
    }

    // Copy the backup file to the database location
    fs.copyFileSync(backupPath, config.dbPath);
    
    logger.info(`Database restored from backup: ${backupPath}`);
    return true;
  } catch (error) {
    logger.error('Database restore failed:', error);
    throw error;
  }
}

/**
 * Restore files from backup archive
 */
async function restoreFiles(archivePath) {
  try {
    if (!fs.existsSync(archivePath)) {
      throw new Error(`Files backup archive not found: ${archivePath}`);
    }

    // Extract the archive to restore files
    execSync(`tar -xzf ${archivePath} -C ${path.dirname(config.exportDir)}`);
    
    logger.info(`Files restored from backup: ${archivePath}`);
    return true;
  } catch (error) {
    logger.error('Files restore failed:', error);
    throw error;
  }
}

/**
 * Interactive restore process
 */
async function interactiveRestore() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('===== Pazar+ Backup Restore Utility =====');
    const backups = listBackups();
    
    if (backups.database.length === 0 && backups.files.length === 0) {
      console.log('No backups found to restore.');
      rl.close();
      return;
    }

    // Database restore
    if (backups.database.length > 0) {
      console.log('\nAvailable database backups:');
      backups.database.forEach((backup, index) => {
        console.log(`[${index + 1}] ${backup.date} - ${backup.file}`);
      });

      const dbAnswer = await new Promise(resolve => {
        rl.question('\nSelect database backup to restore (number) or press Enter to skip: ', resolve);
      });

      if (dbAnswer && !isNaN(parseInt(dbAnswer))) {
        const selectedIndex = parseInt(dbAnswer) - 1;
        if (selectedIndex >= 0 && selectedIndex < backups.database.length) {
          const selectedBackup = backups.database[selectedIndex];
          console.log(`\nRestoring database from ${selectedBackup.file}...`);
          await restoreDatabase(selectedBackup.path);
          console.log('Database restore completed successfully!');
        } else {
          console.log('Invalid selection.');
        }
      }
    }

    // Files restore
    if (backups.files.length > 0) {
      console.log('\nAvailable file backups:');
      backups.files.forEach((backup, index) => {
        console.log(`[${index + 1}] ${backup.date} - ${backup.file}`);
      });

      const filesAnswer = await new Promise(resolve => {
        rl.question('\nSelect files backup to restore (number) or press Enter to skip: ', resolve);
      });

      if (filesAnswer && !isNaN(parseInt(filesAnswer))) {
        const selectedIndex = parseInt(filesAnswer) - 1;
        if (selectedIndex >= 0 && selectedIndex < backups.files.length) {
          const selectedBackup = backups.files[selectedIndex];
          console.log(`\nRestoring files from ${selectedBackup.file}...`);
          await restoreFiles(selectedBackup.path);
          console.log('Files restore completed successfully!');
        } else {
          console.log('Invalid selection.');
        }
      }
    }

    console.log('\nRestore process completed.');
  } catch (error) {
    console.error('Restore process failed:', error);
  } finally {
    rl.close();
  }
}

// If run directly via node
if (require.main === module) {
  interactiveRestore();
}

module.exports = {
  listBackups,
  restoreDatabase,
  restoreFiles,
  interactiveRestore
};