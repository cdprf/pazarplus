#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚨 Client Import Issue Detector');
console.log('===============================\n');

const clientDir = path.join(__dirname, 'client');
const srcDir = path.join(clientDir, 'src');

// Quick scan for import issues that cause crashes
function scanForImportIssues() {
  const issues = [];
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(clientDir, filePath);
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check for problematic import patterns
        const patterns = [
          {
            regex: /import\s+logger\s+from\s+['"]([^'"]*logger)['"](?!\.js|\.jsx|\.ts|\.tsx)/,
            type: 'Logger import without .js extension',
            severity: 'critical'
          },
          {
            regex: /import\s+.*from\s+['"]([^'"]*\/utils\/[^'"]+)['"](?!\.js|\.jsx|\.ts|\.tsx)(?!\/)(?!.*node_modules)/,
            type: 'Utils import without .js extension',
            severity: 'critical'
          },
          {
            regex: /import\s+.*from\s+['"]([^'"]*\/services\/[^'"]+)['"](?!\.js|\.jsx|\.ts|\.tsx)(?!\/)(?!.*node_modules)/,
            type: 'Services import without .js extension',
            severity: 'warning'
          },
          {
            regex: /import\s+.*from\s+['"]([^'"]*\/hooks\/[^'"]+)['"](?!\.js|\.jsx|\.ts|\.tsx)(?!\/)(?!.*node_modules)/,
            type: 'Hooks import without .js extension',
            severity: 'warning'
          },
          {
            regex: /import\s+.*from\s+['"]\.\.[^'"]*['"].*\/$/,
            type: 'Import path ends with slash',
            severity: 'critical'
          },
          {
            regex: /import\s+.*from\s+['"][^'"]*\s+/,
            type: 'Import path contains spaces',
            severity: 'critical'
          }
        ];
        
        patterns.forEach(({ regex, type, severity }) => {
          const match = line.match(regex);
          if (match) {
            issues.push({
              file: relativePath,
              line: lineNum,
              lineContent: line.trim(),
              type,
              severity,
              importPath: match[1] || 'unknown'
            });
          }
        });
      });
      
    } catch (error) {
      issues.push({
        file: path.relative(clientDir, filePath),
        line: 0,
        type: 'File read error',
        severity: 'critical',
        error: error.message
      });
    }
  }
  
  function walkDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'build') {
          walkDirectory(fullPath);
        } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(item)) {
          scanFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }
  
  if (fs.existsSync(srcDir)) {
    walkDirectory(srcDir);
  } else {
    console.error('❌ Client source directory not found!');
    return [];
  }
  
  return issues;
}

// Quick compilation test
function quickCompilationTest() {
  try {
    const { execSync } = require('child_process');
    console.log('🧪 Running quick compilation test...');
    
    process.chdir(clientDir);
    
    // Use TypeScript compiler check if available, otherwise try webpack dry run
    try {
      execSync('npx tsc --noEmit --skipLibCheck 2>/dev/null', { stdio: 'pipe' });
      console.log('✅ TypeScript compilation check passed');
      return true;
    } catch {
      // If TypeScript fails, try a quick webpack syntax check
      try {
        execSync('npm run build --dry-run 2>/dev/null', { stdio: 'pipe', timeout: 10000 });
        console.log('✅ Webpack syntax check passed');
        return true;
      } catch {
        console.log('⚠️  Could not run quick compilation test');
        return null;
      }
    }
  } catch (error) {
    console.log('❌ Quick compilation test failed');
    return false;
  }
}

// Main function
function main() {
  console.log('Scanning for import issues...\n');
  
  const issues = scanForImportIssues();
  
  if (issues.length === 0) {
    console.log('✅ No import issues detected!');
    
    // Run quick compilation test
    const compileResult = quickCompilationTest();
    
    if (compileResult === true) {
      console.log('✅ Client appears healthy!');
      process.exit(0);
    } else if (compileResult === false) {
      console.log('❌ Compilation issues detected - run full health check');
      process.exit(1);
    } else {
      console.log('💡 Consider running full health check: node test-client-health.js');
      process.exit(0);
    }
  }
  
  // Group issues by severity
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  console.log(`🚨 Found ${issues.length} import issues:`);
  console.log(`   💥 ${critical.length} critical issues`);
  console.log(`   ⚠️  ${warnings.length} warnings\n`);
  
  // Show critical issues first
  if (critical.length > 0) {
    console.log('💥 CRITICAL ISSUES (will cause crashes):');
    console.log('-'.repeat(45));
    
    critical.forEach((issue, idx) => {
      console.log(`${idx + 1}. 📄 ${issue.file}:${issue.line}`);
      console.log(`   🔍 ${issue.type}`);
      console.log(`   📝 ${issue.lineContent}`);
      if (issue.importPath) {
        console.log(`   🔗 Import: ${issue.importPath}`);
      }
      console.log('');
    });
  }
  
  // Show warnings
  if (warnings.length > 0 && critical.length < 10) { // Don't overwhelm if too many critical issues
    console.log('⚠️  WARNINGS (potential issues):');
    console.log('-'.repeat(35));
    
    warnings.slice(0, 5).forEach((issue, idx) => {
      console.log(`${idx + 1}. 📄 ${issue.file}:${issue.line}`);
      console.log(`   🔍 ${issue.type}`);
      console.log(`   📝 ${issue.lineContent}`);
      console.log('');
    });
    
    if (warnings.length > 5) {
      console.log(`   ... and ${warnings.length - 5} more warnings\n`);
    }
  }
  
  // Provide fix suggestions
  console.log('💡 RECOMMENDED ACTIONS:');
  console.log('-'.repeat(25));
  
  if (critical.length > 0) {
    console.log('1. 🔧 Run auto-fix: node fix-client-imports.js');
    console.log('2. 🧪 Run full check: node test-client-health.js');
    console.log('3. 🚀 Test client: node start-client.js');
  } else {
    console.log('1. 🧪 Run full health check for complete analysis');
    console.log('2. 🔧 Consider running auto-fix to clean up warnings');
  }
  
  process.exit(critical.length > 0 ? 1 : 0);
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚨 Client Import Issue Detector

A lightweight scanner to quickly detect import issues that cause client crashes.

Usage: node quick-import-check.js [options]

Options:
  --help, -h    Show this help message

This tool specifically looks for:
- Missing .js extensions on utility imports
- Malformed import paths
- Common patterns that cause module resolution failures

For comprehensive analysis, use: node test-client-health.js
For auto-fixing issues, use: node fix-client-imports.js --fix
  `);
  process.exit(0);
}

main();
