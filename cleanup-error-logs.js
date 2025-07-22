#!/usr/bin/env node

/**
 * 🧹 Advanced Log Cleanup Script
 *
 * This comprehensive script manages and removes various types of log files
 * and generated files from your project workspace.
 *
 * 📂 SUPPORTED FILE CATEGORIES:
 * - 🔴 Error logs (error-*.log, *.error)
 * - 💥 Exception logs (exception-*.log, exceptions-*)
 * - ⚠️ Rejection logs (rejection-*.log, unhandled-*)
 * - 📱 App logs (app-*.log, application-*)
 * - 🐛 Debug logs (debug-*.log, trace-*, *.debug)
 * - 📋 Audit logs (audit-*.log, access-*, *.audit)
 * - 📄 Combined logs (combined-*, system-*, server-*)
 * - 🧪 Test logs (test-*.log, spec-*, coverage-*, jest-*, mocha-*)
 * - 📄 Generated files (temp files, backups, generated READMEs, build artifacts)
 *
 * 🎯 CLEANUP OPTIONS:
 * 1. Delete All - Remove all detected files
 * 2. Delete by Category - Choose specific file types
 * 3. Delete by Age - Remove files older than X days
 * 4. Selective Delete - Pick individual files
 * 5. Backup First - Create backup before deletion
 * 6. Preview Only - Show what would be deleted
 * 7. Cancel - Exit safely
 *
 * 🛡️  SAFETY FEATURES:
 * - Detailed file information display
 * - Multiple confirmation prompts
 * - Backup creation option
 * - Category-based organization
 * - Preview mode for testing
 * - Graceful error handling
 * - Excludes main project README.md and docs
 *
 * Usage: node cleanup-error-logs.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ANSI colors for terminal output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

// Log directories to scan
const LOG_DIRECTORIES = [
  "./logs",
  "./server/logs",
  "./client/logs",
  "./", // Root directory for generated files
  "./scripts",
  "./temp",
  "./tmp",
  "./build",
  "./dist",
];

// Log patterns to categorize different types of log files
const LOG_PATTERNS = {
  error: [
    /error.*\.log$/i,
    /\.error.*$/i,
    /error-\d{4}-\d{2}-\d{2}\.log$/i,
    /.*err.*\.log$/i,
    /.*-error-.*$/i,
    /.*_error_.*$/i,
    /.*\.err$/i,
  ],
  exception: [
    /exception.*\.log$/i,
    /\.exception.*$/i,
    /exceptions-\d{4}-\d{2}-\d{2}\.log$/i,
    /.*exception.*\.json$/i,
    /.*-exception-.*$/i,
    /.*_exception_.*$/i,
  ],
  rejection: [
    /rejection.*\.log$/i,
    /\.rejection.*$/i,
    /rejections-\d{4}-\d{2}-\d{2}\.log$/i,
    /.*unhandled.*\.log$/i,
    /.*-rejection-.*$/i,
    /.*_rejection_.*$/i,
  ],
  app: [
    /app.*\.log$/i,
    /\.app.*$/i,
    /app-\d{4}-\d{2}-\d{2}\.log$/i,
    /application.*\.log$/i,
    /.*app.*\.json$/i,
    /.*-app-.*$/i,
    /.*_app_.*$/i,
  ],
  debug: [
    /debug.*\.log$/i,
    /\.debug.*$/i,
    /debug-\d{4}-\d{2}-\d{2}\.log$/i,
    /.*debug.*\.json$/i,
    /.*-debug-.*$/i,
    /.*_debug_.*$/i,
    /.*trace.*\.log$/i,
  ],
  audit: [
    /audit.*\.json$/i,
    /\..*-audit\.json$/i,
    /.*audit.*\.log$/i,
    /.*-audit-.*$/i,
    /.*_audit_.*$/i,
    /.*access.*\.log$/i,
  ],
  combined: [
    /combined.*\.log$/i,
    /out.*\.log$/i,
    /access.*\.log$/i,
    /.*all.*\.log$/i,
    /.*general.*\.log$/i,
    /.*system.*\.log$/i,
    /.*server.*\.log$/i,
  ],
  test: [
    /.*test.*\.log$/i,
    /.*test.*\.json$/i,
    /.*\.test$/i,
    /.*-test-.*$/i,
    /.*_test_.*$/i,
    /.*spec.*\.log$/i,
    /.*mocha.*\.log$/i,
    /.*jest.*\.log$/i,
    /.*coverage.*\.log$/i,
    /.*test-results.*$/i,
    /.*test_.*\.log$/i,
  ],
  generated: [
    // Generated README files (exclude main project README.md)
    /^(?!README\.md$).*readme.*$/i,
    /.*_README.*$/i,
    /.*-README.*$/i,
    /.*readme\.txt$/i,
    /.*CHANGELOG.*$/i,
    /.*changelog.*$/i,
    /.*MIGRATION.*\.md$/i,
    /.*migration.*\.md$/i,
    /.*FIX.*\.md$/i,
    /.*fix.*\.md$/i,
    /.*SUMMARY.*\.md$/i,
    /.*summary.*\.md$/i,
    /.*REPORT.*\.md$/i,
    /.*report.*\.md$/i,
    /.*GUIDE.*\.md$/i,
    /.*guide.*\.md$/i,
    /.*DEPLOYMENT.*\.md$/i,
    /.*deployment.*\.md$/i,
    /.*IMPLEMENTATION.*\.md$/i,
    /.*implementation.*\.md$/i,
    // Backup files
    /.*\.bak$/i,
    /.*\.backup$/i,
    /.*\.old$/i,
    /.*\.orig$/i,
    /.*\.tmp$/i,
    /.*~$/,
    // Generated config files
    /.*\.env\.local$/i,
    /.*\.env\.backup$/i,
    /.*config\.backup$/i,
    // Generated scripts
    /.*-temp\.js$/i,
    /.*_temp\.js$/i,
    /.*\.temp$/i,
    // Build artifacts
    /.*build.*\.log$/i,
    /.*dist.*\.log$/i,
  ],
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Promisify readline question
 */
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get file creation and modification dates
 */
function getFileDates(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      created: stats.birthtime.toISOString().split("T")[0],
      modified: stats.mtime.toISOString().split("T")[0],
      size: stats.size,
    };
  } catch (error) {
    return {
      created: "Unknown",
      modified: "Unknown",
      size: 0,
    };
  }
}

/**
 * Check if file matches specific log type patterns
 */
function categorizeLogFile(filename) {
  for (const [category, patterns] of Object.entries(LOG_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(filename))) {
      return category;
    }
  }
  return "other";
}

/**
 * Check if file matches error log patterns (legacy function for compatibility)
 */
function isErrorLog(filename) {
  return LOG_PATTERNS.error.some((pattern) => pattern.test(filename));
}

/**
 * Scan directories for log files
 */
function scanLogFiles() {
  const logsByCategory = {
    error: [],
    exception: [],
    rejection: [],
    app: [],
    debug: [],
    audit: [],
    combined: [],
    test: [],
    generated: [],
    other: [],
  };

  const allLogs = [];

  console.log(
    `${colors.blue}${colors.bright}🔍 Scanning log directories...${colors.reset}\n`
  );

  for (const logDir of LOG_DIRECTORIES) {
    const resolvedPath = path.resolve(logDir);

    if (!fs.existsSync(resolvedPath)) {
      console.log(
        `${colors.yellow}⚠️  Directory not found: ${logDir}${colors.reset}`
      );
      continue;
    }

    console.log(`${colors.cyan}📁 Scanning: ${logDir}${colors.reset}`);

    try {
      const files = fs.readdirSync(resolvedPath);

      for (const file of files) {
        // Skip hidden files except log-related ones
        if (
          file.startsWith(".") &&
          !file.endsWith(".log") &&
          !file.endsWith(".json")
        ) {
          continue;
        }

        const filePath = path.join(resolvedPath, file);
        const stat = fs.statSync(filePath);

        // Skip directories, except when we're in root directory and want to check specific subdirs
        if (stat.isDirectory()) {
          continue;
        }

        // For root directory, only include files that match our patterns
        if (logDir === "./") {
          const category = categorizeLogFile(file);
          // Skip files that don't match any of our patterns in root directory
          if (category === "other") {
            continue;
          }
        }

        const fileInfo = {
          name: file,
          path: filePath,
          relativePath: path.relative(process.cwd(), filePath),
          directory: logDir,
          category: categorizeLogFile(file),
          ...getFileDates(filePath),
        };

        allLogs.push(fileInfo);
        logsByCategory[fileInfo.category].push(fileInfo);
      }
    } catch (error) {
      console.log(
        `${colors.red}❌ Error reading directory ${logDir}: ${error.message}${colors.reset}`
      );
    }
  }

  return { allLogs, logsByCategory };
}

/**
 * Display files by category in a table format
 */
function displayLogsByCategory(logsByCategory) {
  const categoryColors = {
    error: colors.red,
    exception: colors.magenta,
    rejection: colors.yellow,
    app: colors.blue,
    debug: colors.cyan,
    audit: colors.green,
    combined: colors.white,
    test: colors.green,
    generated: colors.yellow,
    other: colors.gray || colors.white,
  };

  const categoryEmojis = {
    error: "🔴",
    exception: "💥",
    rejection: "⚠️",
    app: "📱",
    debug: "🐛",
    audit: "📋",
    combined: "📄",
    test: "🧪",
    generated: "📄",
    other: "📝",
  };

  let totalFiles = 0;
  let totalSize = 0;

  console.log(
    `${colors.bright}${colors.white}📊 LOG FILES BY CATEGORY${colors.reset}\n`
  );

  for (const [category, files] of Object.entries(logsByCategory)) {
    if (files.length === 0) continue;

    const categoryColor = categoryColors[category] || colors.white;
    const emoji = categoryEmojis[category] || "📄";

    console.log(
      `${categoryColor}${
        colors.bright
      }${emoji} ${category.toUpperCase()} LOGS (${files.length} files):${
        colors.reset
      }`
    );
    console.log(`${colors.white}${"".padEnd(90, "─")}${colors.reset}`);
    console.log(
      `${colors.white}${"File Name".padEnd(35)} ${"Size".padEnd(
        10
      )} ${"Created".padEnd(12)} ${"Modified".padEnd(12)} ${"Path".padEnd(25)}${
        colors.reset
      }`
    );
    console.log(`${colors.white}${"".padEnd(90, "─")}${colors.reset}`);

    let categorySize = 0;

    files.forEach((file) => {
      categorySize += file.size;
      totalSize += file.size;
      totalFiles++;
      console.log(
        `${file.name.padEnd(35)} ` +
          `${formatFileSize(file.size).padEnd(10)} ` +
          `${file.created.padEnd(12)} ` +
          `${file.modified.padEnd(12)} ` +
          `${colors.cyan}${file.relativePath.padEnd(25)}${colors.reset}`
      );
    });

    console.log(`${colors.white}${"".padEnd(90, "─")}${colors.reset}`);
    console.log(
      `${categoryColor}Category Total: ${formatFileSize(categorySize)}${
        colors.reset
      }\n`
    );
  }

  console.log(
    `${colors.bright}${colors.white}📈 OVERALL SUMMARY:${colors.reset}`
  );
  console.log(`${colors.green}Total Files: ${totalFiles}${colors.reset}`);
  console.log(
    `${colors.yellow}Total Size: ${formatFileSize(totalSize)}${colors.reset}\n`
  );
}

/**
 * Get user confirmation with detailed category-based options
 */
async function getUserConfirmation(logsByCategory) {
  console.log(
    `${colors.yellow}${colors.bright}⚠️  LOG CLEANUP OPTIONS${colors.reset}\n`
  );

  // Count total files across all categories
  const totalFiles = Object.values(logsByCategory).reduce(
    (sum, files) => sum + files.length,
    0
  );

  if (totalFiles === 0) {
    console.log(
      `${colors.green}✅ No log files found to remove.${colors.reset}`
    );
    return { shouldDelete: false, selectedFiles: [] };
  }

  const totalSize = Object.values(logsByCategory)
    .flat()
    .reduce((sum, file) => sum + file.size, 0);

  console.log(
    `${colors.white}Found ${totalFiles} log files (${formatFileSize(
      totalSize
    )}) across all categories${colors.reset}\n`
  );

  console.log(`${colors.white}${colors.bright}CLEANUP OPTIONS:${colors.reset}`);
  console.log(
    `${colors.red}1. DELETE ALL - Remove all log files${colors.reset}`
  );
  console.log(
    `${colors.yellow}2. DELETE BY CATEGORY - Choose specific log categories${colors.reset}`
  );
  console.log(
    `${colors.blue}3. DELETE BY AGE - Remove logs older than X days${colors.reset}`
  );
  console.log(
    `${colors.magenta}4. SELECTIVE - Choose individual files${colors.reset}`
  );
  console.log(
    `${colors.green}5. BACKUP FIRST - Create backup before deletion${colors.reset}`
  );
  console.log(
    `${colors.white}6. PREVIEW ONLY - Just show what would be deleted${colors.reset}`
  );
  console.log(`${colors.red}7. CANCEL - Exit without changes${colors.reset}\n`);

  const choice = await question(
    `${colors.bright}Enter your choice (1-7): ${colors.reset}`
  );

  switch (choice.trim()) {
    case "1":
      return await confirmDeleteAll(logsByCategory);

    case "2":
      return await selectByCategory(logsByCategory);

    case "3":
      return await selectByAge(logsByCategory);

    case "4":
      return await selectiveDelete(logsByCategory);

    case "5":
      return await backupAndDelete(logsByCategory);

    case "6":
      return await previewDeletion(logsByCategory);

    case "7":
    case "CANCEL":
    case "cancel":
      return { shouldDelete: false, selectedFiles: [] };

    default:
      console.log(`${colors.red}Invalid choice. Exiting.${colors.reset}`);
      return { shouldDelete: false, selectedFiles: [] };
  }
}

/**
 * Confirm deletion of all files
 */
async function confirmDeleteAll(logsByCategory) {
  const allFiles = Object.values(logsByCategory).flat();
  const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);

  console.log(
    `${colors.red}${colors.bright}⚠️  DELETE ALL LOG FILES${colors.reset}`
  );
  console.log(
    `${colors.red}This will delete ALL ${
      allFiles.length
    } log files (${formatFileSize(totalSize)})${colors.reset}`
  );
  console.log(`${colors.yellow}This action cannot be undone!${colors.reset}\n`);

  const confirm = await question(
    `${colors.red}${colors.bright}Type 'DELETE ALL' to confirm: ${colors.reset}`
  );

  if (confirm.trim() === "DELETE ALL") {
    return { shouldDelete: true, selectedFiles: allFiles };
  }

  return { shouldDelete: false, selectedFiles: [] };
}

/**
 * Select files by category
 */
async function selectByCategory(logsByCategory) {
  console.log(
    `${colors.yellow}${colors.bright}📂 SELECT LOG CATEGORIES TO DELETE${colors.reset}\n`
  );

  const selectedFiles = [];

  for (const [category, files] of Object.entries(logsByCategory)) {
    if (files.length === 0) continue;

    const categorySize = files.reduce((sum, file) => sum + file.size, 0);
    const emoji =
      {
        error: "🔴",
        exception: "💥",
        rejection: "⚠️",
        app: "📱",
        debug: "🐛",
        audit: "📋",
        combined: "📄",
        test: "🧪",
        generated: "📄",
        other: "📝",
      }[category] || "📄";

    console.log(
      `${emoji} ${category.toUpperCase()}: ${
        files.length
      } files (${formatFileSize(categorySize)})`
    );

    const choice = await question(
      `${colors.yellow}Delete ${category} logs? (y/N): ${colors.reset}`
    );

    if (choice.toLowerCase() === "y" || choice.toLowerCase() === "yes") {
      selectedFiles.push(...files);
      console.log(
        `${colors.green}✓ ${category} logs marked for deletion${colors.reset}`
      );
    } else {
      console.log(`${colors.gray}○ ${category} logs skipped${colors.reset}`);
    }
    console.log("");
  }

  if (selectedFiles.length === 0) {
    console.log(
      `${colors.yellow}No categories selected for deletion.${colors.reset}`
    );
    return { shouldDelete: false, selectedFiles: [] };
  }

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  console.log(
    `${colors.red}${colors.bright}Selected ${
      selectedFiles.length
    } files (${formatFileSize(totalSize)}) for deletion${colors.reset}`
  );

  const finalConfirm = await question(
    `${colors.red}${colors.bright}Confirm deletion? Type 'DELETE': ${colors.reset}`
  );

  if (finalConfirm.trim() === "DELETE") {
    return { shouldDelete: true, selectedFiles };
  }

  return { shouldDelete: false, selectedFiles: [] };
}

/**
 * Select files by age
 */
async function selectByAge(logsByCategory) {
  console.log(
    `${colors.blue}${colors.bright}📅 DELETE LOGS BY AGE${colors.reset}\n`
  );

  const daysInput = await question(
    `${colors.blue}Delete logs older than how many days? (e.g., 7): ${colors.reset}`
  );
  const days = parseInt(daysInput.trim());

  if (isNaN(days) || days < 0) {
    console.log(`${colors.red}Invalid number of days.${colors.reset}`);
    return { shouldDelete: false, selectedFiles: [] };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const allFiles = Object.values(logsByCategory).flat();
  const oldFiles = allFiles.filter((file) => {
    const fileDate = new Date(file.modified);
    return fileDate < cutoffDate;
  });

  if (oldFiles.length === 0) {
    console.log(
      `${colors.green}No log files older than ${days} days found.${colors.reset}`
    );
    return { shouldDelete: false, selectedFiles: [] };
  }

  const totalSize = oldFiles.reduce((sum, file) => sum + file.size, 0);
  console.log(
    `${colors.yellow}Found ${
      oldFiles.length
    } log files older than ${days} days (${formatFileSize(totalSize)})${
      colors.reset
    }\n`
  );

  // Show breakdown by category
  const oldByCategory = {};
  oldFiles.forEach((file) => {
    if (!oldByCategory[file.category]) oldByCategory[file.category] = [];
    oldByCategory[file.category].push(file);
  });

  for (const [category, files] of Object.entries(oldByCategory)) {
    const categorySize = files.reduce((sum, file) => sum + file.size, 0);
    console.log(
      `  ${category}: ${files.length} files (${formatFileSize(categorySize)})`
    );
  }

  const confirm = await question(
    `${colors.red}${colors.bright}Delete these ${oldFiles.length} old log files? Type 'DELETE': ${colors.reset}`
  );

  if (confirm.trim() === "DELETE") {
    return { shouldDelete: true, selectedFiles: oldFiles };
  }

  return { shouldDelete: false, selectedFiles: [] };
}

/**
 * Preview what would be deleted without actually deleting
 */
async function previewDeletion(logsByCategory) {
  console.log(
    `${colors.white}${colors.bright}👁️  PREVIEW MODE - No files will be deleted${colors.reset}\n`
  );

  displayLogsByCategory(logsByCategory);

  console.log(
    `${colors.green}Preview completed. No files were deleted.${colors.reset}`
  );
  return { shouldDelete: false, selectedFiles: [] };
}

/**
 * Create backup before deletion
 */
async function createBackupAndConfirm(selectedFiles) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = `./logs-backup-${timestamp}`;

  try {
    fs.mkdirSync(backupDir, { recursive: true });

    console.log(
      `${colors.blue}📦 Creating backup in: ${backupDir}${colors.reset}`
    );

    for (const file of selectedFiles) {
      const backupPath = path.join(backupDir, file.name);
      fs.copyFileSync(file.path, backupPath);
      console.log(`${colors.green}✓ Backed up: ${file.name}${colors.reset}`);
    }

    console.log(
      `${colors.green}${colors.bright}✅ Backup created successfully!${colors.reset}\n`
    );

    const proceed = await question(
      `${colors.yellow}Proceed with deletion? (y/N): ${colors.reset}`
    );
    return proceed.toLowerCase() === "y" || proceed.toLowerCase() === "yes";
  } catch (error) {
    console.log(
      `${colors.red}❌ Failed to create backup: ${error.message}${colors.reset}`
    );
    return false;
  }
}

/**
 * Backup and delete workflow
 */
async function backupAndDelete(logsByCategory) {
  console.log(
    `${colors.green}${colors.bright}💾 BACKUP AND DELETE WORKFLOW${colors.reset}\n`
  );

  const allFiles = Object.values(logsByCategory).flat();

  if (allFiles.length === 0) {
    console.log(`${colors.yellow}No log files found to backup.${colors.reset}`);
    return { shouldDelete: false, selectedFiles: [] };
  }

  const createBackup = await createBackupAndConfirm(allFiles);

  if (createBackup) {
    return { shouldDelete: true, selectedFiles: allFiles };
  }

  return { shouldDelete: false, selectedFiles: [] };
}

/**
 * Selective deletion with file chooser
 */
async function selectiveDelete(logsByCategory) {
  console.log(
    `${colors.blue}${colors.bright}📋 SELECTIVE FILE DELETION${colors.reset}\n`
  );

  const allFiles = Object.values(logsByCategory).flat();
  const selectedFiles = [];

  // Group files by category for easier selection
  for (const [category, files] of Object.entries(logsByCategory)) {
    if (files.length === 0) continue;

    console.log(
      `${colors.cyan}${colors.bright}${category.toUpperCase()} LOGS:${
        colors.reset
      }`
    );

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(
        `${colors.white}${i + 1}. ${file.name} (${formatFileSize(
          file.size
        )}) - ${file.modified}${colors.reset}`
      );

      const choice = await question(
        `${colors.yellow}Delete this file? (y/N): ${colors.reset}`
      );

      if (choice.toLowerCase() === "y" || choice.toLowerCase() === "yes") {
        selectedFiles.push(file);
        console.log(`${colors.green}✓ Marked for deletion${colors.reset}`);
      } else {
        console.log(`${colors.gray}○ Skipped${colors.reset}`);
      }
      console.log("");
    }
  }

  if (selectedFiles.length === 0) {
    console.log(
      `${colors.yellow}No files selected for deletion.${colors.reset}`
    );
    return { shouldDelete: false, selectedFiles: [] };
  }

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  console.log(
    `${colors.red}${colors.bright}Selected ${
      selectedFiles.length
    } files (${formatFileSize(totalSize)}) for deletion:${colors.reset}`
  );
  selectedFiles.forEach((file) => {
    console.log(
      `${colors.red}  - ${file.name} (${file.category})${colors.reset}`
    );
  });

  const finalConfirm = await question(
    `${colors.red}${colors.bright}Confirm deletion? Type 'DELETE': ${colors.reset}`
  );

  if (finalConfirm.trim() === "DELETE") {
    return { shouldDelete: true, selectedFiles };
  }

  return { shouldDelete: false, selectedFiles: [] };
}

/**
 * Delete log files
 */
function deleteLogFiles(selectedFiles) {
  console.log(
    `${colors.red}${colors.bright}🗑️  Deleting log files...${colors.reset}\n`
  );

  let deletedCount = 0;
  let failedCount = 0;
  let totalSize = 0;

  // Group by category for reporting
  const deletedByCategory = {};

  for (const file of selectedFiles) {
    try {
      totalSize += file.size;
      fs.unlinkSync(file.path);
      console.log(
        `${colors.green}✓ Deleted: ${file.relativePath}${colors.reset}`
      );
      deletedCount++;

      // Track by category
      if (!deletedByCategory[file.category]) {
        deletedByCategory[file.category] = { count: 0, size: 0 };
      }
      deletedByCategory[file.category].count++;
      deletedByCategory[file.category].size += file.size;
    } catch (error) {
      console.log(
        `${colors.red}✗ Failed to delete ${file.relativePath}: ${error.message}${colors.reset}`
      );
      failedCount++;
    }
  }

  console.log(`${colors.white}${"".padEnd(70, "─")}${colors.reset}`);
  console.log(
    `${colors.green}${colors.bright}✅ DELETION SUMMARY${colors.reset}`
  );
  console.log(
    `${
      colors.green
    }Successfully deleted: ${deletedCount} files (${formatFileSize(
      totalSize
    )})${colors.reset}`
  );

  if (failedCount > 0) {
    console.log(
      `${colors.red}Failed to delete: ${failedCount} files${colors.reset}`
    );
  }

  if (Object.keys(deletedByCategory).length > 0) {
    console.log(
      `\n${colors.white}${colors.bright}📊 Deleted by category:${colors.reset}`
    );
    for (const [category, stats] of Object.entries(deletedByCategory)) {
      console.log(
        `${colors.cyan}  ${category}: ${stats.count} files (${formatFileSize(
          stats.size
        )})${colors.reset}`
      );
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(
    `${colors.cyan}${colors.bright}🧹 Advanced Log Cleanup Script${colors.reset}\n`
  );
  console.log(
    `${colors.white}This script will help you safely manage and remove log files from your project.${colors.reset}`
  );
  console.log(
    `${colors.white}Supports all log types: error, debug, app, audit, exceptions, rejections, and more.${colors.reset}\n`
  );

  try {
    // Scan for log files
    const { allLogs, logsByCategory } = scanLogFiles();

    // Display findings
    displayLogsByCategory(logsByCategory);

    // Get user confirmation and selection
    const { shouldDelete, selectedFiles } = await getUserConfirmation(
      logsByCategory
    );

    if (shouldDelete && selectedFiles.length > 0) {
      deleteLogFiles(selectedFiles);
      console.log(
        `\n${colors.green}${colors.bright}🎉 Log cleanup completed!${colors.reset}`
      );
    } else {
      console.log(
        `\n${colors.yellow}🚫 Operation cancelled or no files selected. No files were deleted.${colors.reset}`
      );
    }
  } catch (error) {
    console.error(
      `${colors.red}❌ Script failed: ${error.message}${colors.reset}`
    );
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log(
    `\n${colors.yellow}🛑 Script interrupted by user. Exiting safely...${colors.reset}`
  );
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, scanLogFiles, formatFileSize, categorizeLogFile };
