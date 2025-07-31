#!/usr/bin/env node

/**
 * 🧹 VPS Error Logs Cleanup & Diagnostic Tool (JavaScript Version)
 * ================================================================
 *
 * Advanced VPS-specific log cleanup utility with self-deletion capability
 *
 * Features:
 * - Comprehensive error log detection across VPS directories
 * - Disk space analysis and reporting
 * - Self-deletion after successful execution
 * - Detailed categorization and logging
 * - Multiple cleanup modes (dry-run, selective, etc.)
 * - VPS-specific optimizations
 *
 * Usage:
 *   node vps-error-logs-cleaner.js [options]
 *
 * Options:
 *   --dry-run        Preview cleanup without actually deleting files
 *   --keep-script    Don't delete this script after execution
 *   --verbose        Show detailed output
 *   --auto-confirm   Skip confirmation prompts (use with caution)
 *   --max-age DAYS   Only delete logs older than specified days
 *   --min-size SIZE  Only delete files larger than specified size (e.g., 1M, 100K)
 *
 * @version 2.0.0
 * @author Pazar+ Development Team
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

// Script configuration
const SCRIPT_CONFIG = {
  name: "VPS Error Logs Cleaner",
  version: "2.0.0",
  scriptFile: process.argv[1],
  logFile: `/tmp/vps-cleanup-js-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19)}.log`,
};

// ANSI color codes
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bright: "\x1b[1m",
  reset: "\x1b[0m",
};

// Command line options
const options = {
  dryRun: process.argv.includes("--dry-run"),
  keepScript: process.argv.includes("--keep-script"),
  verbose: process.argv.includes("--verbose"),
  autoConfirm: process.argv.includes("--auto-confirm"),
  maxAge: null,
  minSize: null,
};

// Parse additional options
const maxAgeIndex = process.argv.indexOf("--max-age");
if (maxAgeIndex !== -1 && process.argv[maxAgeIndex + 1]) {
  options.maxAge = parseInt(process.argv[maxAgeIndex + 1]);
}

const minSizeIndex = process.argv.indexOf("--min-size");
if (minSizeIndex !== -1 && process.argv[minSizeIndex + 1]) {
  options.minSize = parseSizeString(process.argv[minSizeIndex + 1]);
}

// VPS-specific log directories
const VPS_LOG_DIRECTORIES = [
  "/var/log",
  "/var/log/nginx",
  "/var/log/apache2",
  "/var/log/httpd",
  "/var/www/html/pazar/logs",
  "/var/www/html/pazar+/logs",
  "/var/www/html/pazar/server/logs",
  "/var/www/html/pazar+/server/logs",
  "/var/www/pazar/logs",
  "/var/www/pazar+/logs",
  "/var/www/pazar/server/logs",
  "/var/www/pazar+/server/logs",
  "/opt/pazar/logs",
  "/opt/pazar+/logs",
  `${process.cwd()}/logs`,
  `${process.cwd()}/server/logs`,
  "/tmp",
  "/var/tmp",
  `${process.env.HOME}/.pm2/logs`,
  "/root/.pm2/logs",
];

// Enhanced error log patterns for VPS environments
const ERROR_LOG_PATTERNS = [
  // Error logs
  /.*error.*\.log$/i,
  /.*\.err$/i,
  /.*exception.*\.log$/i,
  /.*rejection.*\.log$/i,
  /.*crash.*\.log$/i,
  /.*uncaught.*\.log$/i,
  /.*unhandled.*\.log$/i,

  // Debug and trace logs
  /.*debug.*\.log$/i,
  /.*trace.*\.log$/i,
  /npm-debug.*\.log$/i,
  /node-debug.*\.log$/i,

  // PM2 logs
  /pm2-.*\.log$/i,
  /.*-error-.*\.log$/i,
  /.*-out-.*\.log$/i,

  // System logs (rotated)
  /access\.log\.\d+$/i,
  /error\.log\.\d+$/i,
  /.*\.log\.gz$/i,
  /.*\.log\.\d+$/i,

  // Temporary and backup files
  /.*\.tmp$/i,
  /.*\.temp$/i,
  /.*\.bak$/i,
  /.*\.backup$/i,
  /.*\.old$/i,
  /nohup\.out$/i,
  /core\.\d+$/i,

  // Application specific
  /.*app.*\.log$/i,
  /.*server.*\.log$/i,
  /.*system.*\.log$/i,
  /.*audit.*\.log$/i,
  /.*combined.*\.log$/i,
];

// Global state
let foundLogFiles = [];
let totalLogFiles = 0;
let totalLogSize = 0;

// Utility functions
function parseSizeString(sizeStr) {
  const units = { K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^(\d+)([KMG]?)$/i);
  if (!match) return 0;

  const [, size, unit] = match;
  return parseInt(size) * (units[unit.toUpperCase()] || 1);
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function logMessage(level, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;

  // Write to log file
  fs.appendFileSync(SCRIPT_CONFIG.logFile, logEntry);

  // Console output with colors
  const colorMap = {
    INFO: colors.blue,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red,
    DEBUG: colors.magenta,
  };

  const emoji = {
    INFO: "ℹ️",
    SUCCESS: "✅",
    WARNING: "⚠️",
    ERROR: "❌",
    DEBUG: "🔍",
  };

  if (level === "DEBUG" && !options.verbose) return;

  const color = colorMap[level] || colors.white;
  console.log(`${color}${emoji[level] || "📝"} ${message}${colors.reset}`);
}

function printHeader() {
  console.log(
    `${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.cyan}║${colors.white}${colors.bright}          ${SCRIPT_CONFIG.name} v${SCRIPT_CONFIG.version}          ${colors.reset}${colors.cyan}║${colors.reset}`
  );
  console.log(
    `${colors.cyan}║${colors.white}              VPS Log Cleanup & Diagnostic (JS)              ${colors.reset}${colors.cyan}║${colors.reset}`
  );
  console.log(
    `${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log("");
}

function checkPermissions() {
  logMessage("INFO", "Checking permissions...");

  if (process.getuid && process.getuid() === 0) {
    logMessage("SUCCESS", "Running as root - full access granted");
  } else {
    logMessage(
      "WARNING",
      "Not running as root - some system logs may be inaccessible"
    );
    logMessage(
      "INFO",
      "Consider running with: sudo node " + SCRIPT_CONFIG.scriptFile
    );
  }
}

function getSystemInfo() {
  logMessage("INFO", "Gathering system information...");

  console.log(
    `${colors.white}${colors.bright}🖥️  SYSTEM INFORMATION${colors.reset}`
  );
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`
  );

  try {
    // OS Information
    if (fs.existsSync("/etc/os-release")) {
      const osRelease = fs.readFileSync("/etc/os-release", "utf8");
      const prettyName = osRelease.match(/PRETTY_NAME="([^"]+)"/);
      if (prettyName) {
        console.log(`OS: ${colors.green}${prettyName[1]}${colors.reset}`);
      }
    }

    // Node.js version
    console.log(`Node.js: ${colors.green}${process.version}${colors.reset}`);

    // Platform and architecture
    console.log(
      `Platform: ${colors.green}${process.platform} ${process.arch}${colors.reset}`
    );

    // Disk space
    try {
      const dfOutput = execSync("df -h /", { encoding: "utf8" });
      const diskInfo = dfOutput.split("\n")[1].split(/\s+/);
      console.log(
        `Disk Usage: ${colors.green}${diskInfo[2]} used / ${diskInfo[1]} total (${diskInfo[4]} full)${colors.reset}`
      );
    } catch (err) {
      logMessage("DEBUG", "Could not get disk information: " + err.message);
    }

    // Memory information
    try {
      const memInfo = execSync("free -h", { encoding: "utf8" });
      const memLine = memInfo.split("\n")[1].split(/\s+/);
      console.log(
        `Memory: ${colors.green}${memLine[2]} used / ${memLine[1]} total${colors.reset}`
      );
    } catch (err) {
      logMessage("DEBUG", "Could not get memory information: " + err.message);
    }

    // Load average
    try {
      const loadavg = fs
        .readFileSync("/proc/loadavg", "utf8")
        .split(" ")
        .slice(0, 3)
        .join(" ");
      console.log(`Load Average: ${colors.green}${loadavg}${colors.reset}`);
    } catch (err) {
      logMessage("DEBUG", "Could not get load average: " + err.message);
    }
  } catch (err) {
    logMessage("ERROR", "Error gathering system info: " + err.message);
  }

  console.log("");
}

function checkRunningProcesses() {
  logMessage("INFO", "Checking for relevant running processes...");

  console.log(
    `${colors.white}${colors.bright}🔄 RUNNING PROCESSES${colors.reset}`
  );
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`
  );

  try {
    // Check Node.js processes
    const nodeProcs = execSync('pgrep -f "node" | wc -l', {
      encoding: "utf8",
    }).trim();
    if (parseInt(nodeProcs) > 0) {
      console.log(
        `Node.js processes: ${colors.green}${nodeProcs} running${colors.reset}`
      );
    } else {
      console.log(
        `Node.js processes: ${colors.yellow}None running${colors.reset}`
      );
    }

    // Check PM2
    try {
      execSync("which pm2", { stdio: "pipe" });
      const pm2List = execSync("pm2 jlist 2>/dev/null", { encoding: "utf8" });
      const pm2Count = JSON.parse(pm2List).length;
      console.log(
        `PM2 processes: ${colors.green}${pm2Count} managed${colors.reset}`
      );
    } catch (err) {
      console.log(
        `PM2: ${colors.yellow}Not installed or not running${colors.reset}`
      );
    }

    // Check web servers
    const nginxProcs = execSync("pgrep nginx | wc -l", {
      encoding: "utf8",
    }).trim();
    const apacheProcs = execSync('pgrep -f "apache|httpd" | wc -l', {
      encoding: "utf8",
    }).trim();

    console.log(
      `Nginx: ${
        parseInt(nginxProcs) > 0
          ? colors.green + "Running"
          : colors.yellow + "Not running"
      }${colors.reset}`
    );
    console.log(
      `Apache: ${
        parseInt(apacheProcs) > 0
          ? colors.green + "Running"
          : colors.yellow + "Not running"
      }${colors.reset}`
    );
  } catch (err) {
    logMessage("ERROR", "Error checking processes: " + err.message);
  }

  console.log("");
}

function scanErrorLogs() {
  logMessage("INFO", "Scanning VPS directories for error logs...");

  foundLogFiles = [];
  totalLogFiles = 0;
  totalLogSize = 0;

  for (const dir of VPS_LOG_DIRECTORIES) {
    if (!fs.existsSync(dir)) {
      logMessage("DEBUG", `Directory not found: ${dir}`);
      continue;
    }

    logMessage("DEBUG", `Scanning directory: ${dir}`);

    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);

        try {
          const stats = fs.statSync(filePath);

          // Skip directories
          if (stats.isDirectory()) continue;

          // Check if file matches error log patterns
          const matchesPattern = ERROR_LOG_PATTERNS.some((pattern) =>
            pattern.test(file)
          );
          if (!matchesPattern) continue;

          // Check file age filter
          if (options.maxAge) {
            const daysSinceModified =
              (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceModified < options.maxAge) {
              logMessage(
                "DEBUG",
                `Skipping recent file: ${filePath} (${daysSinceModified.toFixed(
                  1
                )} days old)`
              );
              continue;
            }
          }

          // Check file size filter
          if (options.minSize && stats.size < options.minSize) {
            logMessage(
              "DEBUG",
              `Skipping small file: ${filePath} (${formatBytes(stats.size)})`
            );
            continue;
          }

          const fileInfo = {
            path: filePath,
            name: file,
            size: stats.size,
            modified: stats.mtime,
            category: categorizeLogFile(file),
          };

          foundLogFiles.push(fileInfo);
          totalLogFiles++;
          totalLogSize += stats.size;

          logMessage(
            "DEBUG",
            `Found: ${filePath} (${formatBytes(stats.size)})`
          );
        } catch (err) {
          logMessage(
            "DEBUG",
            `Error accessing file ${filePath}: ${err.message}`
          );
        }
      }
    } catch (err) {
      logMessage("WARNING", `Error reading directory ${dir}: ${err.message}`);
    }
  }

  logMessage(
    "INFO",
    `Scan complete: ${totalLogFiles} files found (${formatBytes(
      totalLogSize
    )} total)`
  );
}

function categorizeLogFile(filename) {
  const categories = {
    error: /error|err|exception|crash|rejection|uncaught|unhandled/i,
    debug: /debug|trace/i,
    system: /access\.log|error\.log|\.log\.gz|\.log\.\d+/i,
    app: /app|server|pm2|npm-debug|node-debug/i,
    temp: /\.tmp|\.temp|\.bak|\.backup|\.old|nohup\.out|core\.\d+/i,
  };

  for (const [category, pattern] of Object.entries(categories)) {
    if (pattern.test(filename)) {
      return category;
    }
  }

  return "other";
}

function displayFoundLogs() {
  if (totalLogFiles === 0) {
    logMessage("SUCCESS", "No error logs found - system is clean!");
    return;
  }

  console.log("");
  console.log(
    `${colors.white}${colors.bright}📊 FOUND ERROR LOGS SUMMARY${colors.reset}`
  );
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`
  );

  // Group by category
  const categorized = {
    error: [],
    debug: [],
    system: [],
    app: [],
    temp: [],
    other: [],
  };

  foundLogFiles.forEach((file) => {
    categorized[file.category].push(file);
  });

  // Display each category
  const categoryEmojis = {
    error: "🔴",
    debug: "🐛",
    system: "🖥️",
    app: "📱",
    temp: "📄",
    other: "📂",
  };

  for (const [category, files] of Object.entries(categorized)) {
    if (files.length === 0) continue;

    const categorySize = files.reduce((sum, file) => sum + file.size, 0);
    const emoji = categoryEmojis[category] || "📝";

    console.log(
      `${colors.yellow}${emoji} ${category.toUpperCase()} LOGS (${
        files.length
      } files):${colors.reset}`
    );

    files.slice(0, 10).forEach((file) => {
      // Show max 10 files per category
      const displayPath =
        file.path.length > 70 ? "..." + file.path.slice(-67) : file.path;
      console.log(
        `  ${displayPath.padEnd(70)} ${formatBytes(file.size).padStart(10)}`
      );
    });

    if (files.length > 10) {
      console.log(
        `  ${colors.magenta}... and ${files.length - 10} more files${
          colors.reset
        }`
      );
    }

    console.log(
      `  ${colors.green}Category Total: ${formatBytes(categorySize)}${
        colors.reset
      }`
    );
    console.log("");
  }

  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(
    `${colors.white}${
      colors.bright
    }Total: ${totalLogFiles} files (${formatBytes(totalLogSize)})${
      colors.reset
    }`
  );
  console.log("");
}

async function getUserConfirmation() {
  if (options.autoConfirm) {
    logMessage("INFO", "Auto-confirm enabled - proceeding with cleanup");
    return true;
  }

  if (options.dryRun) {
    logMessage("INFO", "Dry run mode - no confirmation needed");
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log(
      `${
        colors.yellow
      }⚠️  This will permanently delete ${totalLogFiles} log files (${formatBytes(
        totalLogSize
      )})${colors.reset}`
    );
    console.log(`${colors.red}This action cannot be undone!${colors.reset}`);
    console.log("");

    rl.question("Continue with cleanup? (y/N): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

function cleanupLogs() {
  if (totalLogFiles === 0) {
    logMessage("INFO", "No logs to clean up");
    return;
  }

  if (options.dryRun) {
    logMessage("WARNING", "DRY RUN MODE - No files will be deleted");
    logMessage(
      "INFO",
      `Would delete ${totalLogFiles} files (${formatBytes(totalLogSize)})`
    );
    return;
  }

  logMessage("INFO", `Starting cleanup of ${totalLogFiles} log files...`);

  let deletedCount = 0;
  let deletedSize = 0;
  let failedCount = 0;

  for (const file of foundLogFiles) {
    try {
      fs.unlinkSync(file.path);
      deletedCount++;
      deletedSize += file.size;
      logMessage("DEBUG", `Deleted: ${file.path}`);
    } catch (err) {
      failedCount++;
      logMessage("WARNING", `Failed to delete: ${file.path} - ${err.message}`);
    }
  }

  logMessage("SUCCESS", "Cleanup complete!");
  logMessage(
    "INFO",
    `Deleted: ${deletedCount} files (${formatBytes(deletedSize)})`
  );

  if (failedCount > 0) {
    logMessage("WARNING", `Failed to delete: ${failedCount} files`);
  }
}

function generateReport() {
  const reportFile = `/tmp/vps-cleanup-js-report-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19)}.json`;

  const report = {
    timestamp: new Date().toISOString(),
    script: {
      name: SCRIPT_CONFIG.name,
      version: SCRIPT_CONFIG.version,
      file: SCRIPT_CONFIG.scriptFile,
    },
    system: {
      hostname: require("os").hostname(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    options: options,
    results: {
      totalLogFiles,
      totalLogSize,
      foundLogFiles: foundLogFiles.map((f) => ({
        path: f.path,
        name: f.name,
        size: f.size,
        category: f.category,
        modified: f.modified,
      })),
    },
  };

  try {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logMessage("SUCCESS", `Report saved to: ${reportFile}`);
  } catch (err) {
    logMessage("ERROR", `Failed to save report: ${err.message}`);
  }
}

function selfDestruct() {
  if (options.keepScript) {
    logMessage(
      "INFO",
      `Script preservation requested - keeping ${SCRIPT_CONFIG.scriptFile}`
    );
    return;
  }

  if (options.dryRun) {
    logMessage("INFO", "Dry run mode - script will not self-destruct");
    return;
  }

  logMessage("WARNING", "Self-destructing in 5 seconds... (Ctrl+C to cancel)");

  let countdown = 5;
  const countdownInterval = setInterval(() => {
    process.stdout.write(`${colors.red}${countdown}... ${colors.reset}`);
    countdown--;

    if (countdown < 0) {
      clearInterval(countdownInterval);
      console.log("");

      logMessage("INFO", "Initiating self-destruct sequence...");

      // Copy log to permanent location
      const finalLog = `/var/log/vps-cleanup-js-final-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19)}.log`;
      try {
        fs.copyFileSync(SCRIPT_CONFIG.logFile, finalLog);
        logMessage("SUCCESS", `Final log saved to: ${finalLog}`);
      } catch (err) {
        logMessage("WARNING", `Could not save final log: ${err.message}`);
      }

      // Remove temporary log
      try {
        fs.unlinkSync(SCRIPT_CONFIG.logFile);
      } catch (err) {
        // Ignore error
      }

      // Self-destruct
      logMessage("SUCCESS", "Mission accomplished. Script self-destructing...");

      try {
        fs.unlinkSync(SCRIPT_CONFIG.scriptFile);
        console.log(
          `${colors.green}🎯 VPS cleanup completed successfully!${colors.reset}`
        );
        console.log(
          `${colors.cyan}💥 Script has been automatically removed.${colors.reset}`
        );
      } catch (err) {
        logMessage("ERROR", `Failed to self-destruct: ${err.message}`);
      }

      process.exit(0);
    }
  }, 1000);
}

// Signal handlers
process.on("SIGINT", () => {
  console.log(
    `\n${colors.yellow}🛑 Cleanup interrupted by user${colors.reset}`
  );
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log(`\n${colors.yellow}🛑 Cleanup terminated${colors.reset}`);
  process.exit(1);
});

// Main execution
async function main() {
  try {
    printHeader();

    logMessage(
      "INFO",
      `Starting ${SCRIPT_CONFIG.name} v${SCRIPT_CONFIG.version}`
    );
    logMessage("INFO", `Script file: ${SCRIPT_CONFIG.scriptFile}`);
    logMessage("INFO", `Log file: ${SCRIPT_CONFIG.logFile}`);
    logMessage("INFO", `Options: ${JSON.stringify(options)}`);

    // Initial checks and information gathering
    checkPermissions();
    getSystemInfo();
    checkRunningProcesses();

    // Get initial disk space
    const diskBefore = fs.statSync("/").free || 0;

    // Scan and display logs
    scanErrorLogs();
    displayFoundLogs();

    // Get user confirmation
    if (totalLogFiles > 0) {
      const confirmed = await getUserConfirmation();
      if (!confirmed) {
        logMessage("INFO", "Cleanup cancelled by user");
        process.exit(0);
      }
    }

    // Perform cleanup
    cleanupLogs();

    // Calculate space freed
    const diskAfter = fs.statSync("/").free || 0;
    const spaceFreed = diskAfter - diskBefore;

    if (spaceFreed > 0) {
      logMessage("SUCCESS", `Freed ${formatBytes(spaceFreed)} of disk space`);
    }

    // Generate final report
    generateReport();

    logMessage("SUCCESS", "VPS cleanup completed successfully!");

    // Self-destruct sequence
    selfDestruct();
  } catch (error) {
    logMessage("ERROR", `Script failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
${colors.cyan}${colors.bright}${SCRIPT_CONFIG.name} v${SCRIPT_CONFIG.version}${
    colors.reset
  }

${colors.white}Usage:${colors.reset}
  node ${path.basename(SCRIPT_CONFIG.scriptFile)} [options]

${colors.white}Options:${colors.reset}
  --dry-run         Preview cleanup without actually deleting files
  --keep-script     Don't delete this script after execution
  --verbose         Show detailed output
  --auto-confirm    Skip confirmation prompts (use with caution)
  --max-age DAYS    Only delete logs older than specified days
  --min-size SIZE   Only delete files larger than specified size (e.g., 1M, 100K)
  --help, -h        Show this help message

${colors.white}Examples:${colors.reset}
  node ${path.basename(SCRIPT_CONFIG.scriptFile)} --dry-run
  node ${path.basename(SCRIPT_CONFIG.scriptFile)} --max-age 7 --verbose
  node ${path.basename(SCRIPT_CONFIG.scriptFile)} --min-size 1M --auto-confirm
  sudo node ${path.basename(SCRIPT_CONFIG.scriptFile)} --keep-script

${colors.yellow}Note: Run with sudo for access to all system log directories${
    colors.reset
  }
`);
  process.exit(0);
}

// Run the main function
main();
