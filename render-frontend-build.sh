#!/bin/bash

# Render Frontend Build Script for Pazar+
# This script builds the React client and ensures the build directory is in the correct location

set -e  # Exit on any error

echo "🚀 Starting Render frontend build process..."

# Ensure we're in the project root
cd "$(dirname "$0")"

echo "📦 Installing client dependencies..."
cd client
npm ci --production=false

echo "🔨 Building React application..."
CI=false npm run build

echo "📁 Moving build directory to root for Render..."
cd ..
if [ -d "build" ]; then
    rm -rf build
fi
mv client/build ./build

echo "✅ Build completed successfully!"
echo "📊 Build directory contents:"
ls -la build/

echo "🎉 Ready for Render deployment!"
