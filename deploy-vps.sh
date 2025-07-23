#!/bin/bash

# VPS Deployment Script for Pazar+
echo "🚀 Starting Pazar+ VPS deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version must be 18.0.0 or higher. Current version: $NODE_VERSION"
    exit 1
fi

print_status "Node.js version check passed: $NODE_VERSION"

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed globally. Installing PM2..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        print_error "Failed to install PM2. Please run: sudo npm install -g pm2"
        exit 1
    fi
fi

print_status "PM2 is available"

# Create logs directory
mkdir -p logs

# Install dependencies
print_status "Installing server dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install server dependencies"
    exit 1
fi

print_status "Installing client dependencies..."
cd client && npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install client dependencies"
    exit 1
fi

print_status "Building client application..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Failed to build client application"
    exit 1
fi

cd ..

# Set up environment variables
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env 2>/dev/null || {
        print_error "No .env.example found. Please create .env file manually."
        exit 1
    }
fi

# Check if PostgreSQL is configured
if grep -q "DB_PASSWORD=" .env && [ -z "$(grep 'DB_PASSWORD=' .env | cut -d'=' -f2)" ]; then
    print_warning "Database password not set in .env file. Please configure your database settings."
fi

print_status "Deployment preparation completed successfully!"
print_status "To start the application, run: npm run pm2:start"
print_status "To check logs, run: npm run pm2:logs"
print_status "To restart the application, run: npm run pm2:restart"

echo ""
echo "🎉 Deployment script completed!"
echo "📋 Next steps:"
echo "   1. Configure your .env file with proper database credentials"
echo "   2. Ensure PostgreSQL is running and accessible"
echo "   3. Start the application with: npm run pm2:start"
