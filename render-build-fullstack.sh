#!/bin/bash

# Render Fullstack Build Script for Pazar+
# This script builds both the client and server for a single-service deployment

set -e

echo "🚀 Starting fullstack build for Render deployment..."

# Log Node.js and npm versions
echo "📦 Node.js version: $(node --version)"
echo "📦 npm version: $(npm --version)"

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm ci --production=false
cd ..

# Install client dependencies and build
echo "📦 Installing client dependencies..."
cd client
npm ci --production=false

echo "🏗️ Building React application..."
npm run build

echo "✅ React build completed"
ls -la build/

cd ..

echo "✅ Fullstack build completed successfully!"
echo "📁 Client build is in: client/build/"
echo "📁 Server is in: server/"

# Verify build files exist
if [ -f "client/build/index.html" ]; then
    echo "✅ Client build verified - index.html exists"
else
    echo "❌ Client build failed - index.html not found"
    exit 1
fi

echo "🎉 Ready for deployment!"
