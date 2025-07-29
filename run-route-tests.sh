#!/bin/bash

# Routes Loading Test Script Launcher

# Display header
echo "============================="
echo "Pazar+ Routes Loading Tester"
echo "============================="

# Create temporary node_modules if needed
if [ ! -d "node_modules/chalk" ]; then
  echo "Setting up test environment..."
  npm install --no-save chalk@5.4.1
fi

# Run the test script
echo "Running route loading tests..."
NODE_OPTIONS="--no-warnings" node --experimental-json-modules test-routes-loading.js

# Exit with the same status as the test script
exit $?
