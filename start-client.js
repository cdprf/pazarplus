#!/usr/bin/env node

const { execSync, spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting Pazar+ Client");
console.log("========================\n");

const clientDir = path.join(__dirname, "client");

// Kill existing processes
try {
  console.log("🔄 Stopping any existing client processes...");
  execSync('pkill -f "react-scripts.*start" || true', { stdio: "ignore" });
  execSync('pkill -f "node.*react-scripts" || true', { stdio: "ignore" });
  console.log("✅ Existing processes stopped\n");
} catch (error) {
  console.log("ℹ️  No existing processes to stop\n");
}

// Start the client
console.log("🚀 Starting React development server...");
process.chdir(clientDir);

const child = spawn("npm", ["start"], {
  stdio: "inherit", // Show output directly
  env: { ...process.env },
});

child.on("exit", (code) => {
  if (code !== 0) {
    console.log(`\n❌ Client exited with code ${code}`);
    process.exit(code);
  }
});

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping client...");
  child.kill("SIGINT");
  process.exit(0);
});

console.log("💡 Press Ctrl+C to stop the client\n");
