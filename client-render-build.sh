#!/bin/bash

# Alternative Render Frontend Build Script
# This builds the client but keeps the build directory in client/build
# Use this if your Render Static Site is configured with publish directory: client/build

set -e  # Exit on any error

echo "🚀 Starting Render frontend build process (in-place)..."

# Ensure we're in the project root
cd "$(dirname "$0")"

echo "📦 Installing client dependencies..."
cd client
npm ci --production=false

echo "🔨 Building React application..."
CI=false npm run build

echo "✅ Build completed successfully!"
echo "📊 Build directory contents:"
ls -la build/

echo "🎉 Ready for Render deployment! (Publish directory: client/build)"
