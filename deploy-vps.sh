#!/bin/bash

# VPS Deployment Script for Pazar+
echo "🚀 Starting Pazar+ VPS deployment..."

# Stop existing PM2 processes
echo "⏹️  Stopping existing processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
cd /path/to/your/pazar-plus
npm install --production

# Set up environment
echo "🌍 Setting up environment..."
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please create it based on .env.vps-template"
    exit 1
fi

# Run database migrations
echo "🗄️  Running database migrations..."
npm run migrate 2>/dev/null || echo "⚠️  Migration failed or not configured"

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Start server with PM2
echo "🔄 Starting server with PM2..."
pm2 start ecosystem.config.js --env production

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "✅ Deployment complete!"
echo "📋 Check logs with: pm2 logs"
echo "🔍 Monitor with: pm2 monit"
