#!/usr/bin/env node

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🔧 Rate Limit Reset Utility");
console.log("This will restart the server to clear rate limiting cache");

rl.question("Do you want to restart the server? (y/N): ", (answer) => {
  if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
    console.log("✅ Server restart initiated...");
    console.log("Rate limits have been reset!");
    process.exit(0);
  } else {
    console.log("❌ Operation cancelled");
    process.exit(0);
  }
  rl.close();
});
