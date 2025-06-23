# Pazar+ Deployment Guide

## 🚀 Quick Start

This guide will help you deploy Pazar+ with all necessary database tables created automatically.

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Database server (PostgreSQL/MySQL for production, SQLite for development)

### 1. Clone and Setup

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the server directory:

```env
# Environment
NODE_ENV=development

# Database Configuration
DB_TYPE=sqlite                    # sqlite, postgres, mysql
DB_STORAGE=./database.sqlite      # For SQLite
# DB_HOST=localhost               # For PostgreSQL/MySQL
# DB_USER=your_username           # For PostgreSQL/MySQL
# DB_PASSWORD=your_password       # For PostgreSQL/MySQL
# DB_NAME=pazar_plus              # For PostgreSQL/MySQL

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRES_IN=7d

# API Configuration
PORT=3000
API_VERSION=v1

# Redis Configuration (Optional)
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your_redis_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window

# File Upload
MAX_FILE_SIZE=10485760           # 10MB
UPLOAD_PATH=./uploads

# Platform API Keys (Add your platform credentials)
# TRENDYOL_API_KEY=your_trendyol_api_key
# TRENDYOL_API_SECRET=your_trendyol_api_secret
# HEPSIBURADA_USERNAME=your_hepsiburada_username
# HEPSIBURADA_PASSWORD=your_hepsiburada_password
# N11_API_KEY=your_n11_api_key
# N11_API_SECRET=your_n11_api_secret
```

### 3. Database Initialization

#### Option A: Automatic Setup (Recommended)

Run the initialization script:

```bash
# Make script executable (if not already)
chmod +x init-database.sh

# Run the initialization
./init-database.sh
```

#### Option B: Manual Setup

```bash
# Run migrations to create all tables
npm run db:migrate

# Seed the database with admin user and default data
npm run db:seed
```

### 4. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start

# Debug mode
npm run debug
```

## 📊 Database Schema

The migration files will automatically create the following tables:

### Core Tables

- **users** - User accounts and authentication
- **platform_connections** - E-commerce platform integrations
- **products** - Product catalog
- **product_variants** - Product variations (size, color, etc.)
- **product_media** - Product images and videos
- **orders** - Order management
- **order_items** - Individual order line items
- **background_tasks** - Async task management
- **subscriptions** - User subscription plans

### Platform-Specific Tables

- **hepsiburada_products** - Hepsiburada product mappings
- **trendyol_products** - Trendyol product mappings
- **n11_products** - N11 product mappings
- **platform_categories** - Platform category mappings

### Operations Tables

- **inventory_movements** - Stock tracking
- **inventory_sync** - Inventory synchronization
- **bulk_operations** - Bulk import/export operations
- **platform_conflicts** - Data conflict resolution
- **settings** - User and system settings

### Compliance & Shipping

- **turkish_compliance** - Turkish regulatory compliance
- **compliance_documents** - Compliance document storage
- **shipping_details** - Order shipping information
- **shipping_carriers** - Shipping provider configuration
- **shipping_rates** - Shipping cost calculations

### Financial

- **invoices** - Invoice generation and tracking
- **stock_reservations** - Inventory reservations
- **usage_records** - Feature usage tracking

## 🔐 Default Admin User

After running the seeders, you'll have a default admin account:

- **Email:** <admin@pazarplus.com>
- **Password:** PazarPlus2025!

⚠️ **Important:** Change this password immediately after first login!

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start with auto-reload
npm run debug           # Start with debugger
npm run debug-brk       # Start with debugger break

# Database
npm run db:migrate      # Run pending migrations
npm run db:seed         # Run all seeders
npm run db:reset        # Reset and recreate database

# Production
npm start               # Start production server
```

## 📱 API Endpoints

Once deployed, your API will be available at:

- **Base URL:** `http://localhost:3000/api/v1`
- **Authentication:** `/api/v1/auth/login`
- **Products:** `/api/v1/products`
- **Orders:** `/api/v1/orders`
- **Platform Operations:** `/api/v1/platform-operations`

## 🔍 Health Check

Test your deployment:

```bash
curl http://localhost:3000/api/v1/health
```

## 🐳 Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t pazar-plus .
docker run -p 3000:3000 -v $(pwd)/database.sqlite:/app/database.sqlite pazar-plus
```

## 🚨 Troubleshooting

### Common Issues

1. **Migration fails:**
   - Check database credentials in `.env`
   - Ensure database server is running
   - Verify database permissions

2. **Port already in use:**
   - Change PORT in `.env` file
   - Kill processes using port 3000: `pkill -f node`

3. **Authentication errors:**
   - Verify JWT_SECRET is set in `.env`
   - Check if admin user was created properly

4. **Platform integration issues:**
   - Verify API credentials in `.env`
   - Check platform API documentation for changes

### Logs

Check application logs:

```bash
# View real-time logs
tail -f logs/app-$(date +%Y-%m-%d).log

# View error logs
tail -f logs/error-$(date +%Y-%m-%d).log
```

## 📞 Support

If you encounter issues:

1. Check the logs in the `logs/` directory
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed with `npm install`
4. Try resetting the database with `npm run db:reset`

## 🎯 Next Steps

After successful deployment:

1. Change the default admin password
2. Configure your platform API credentials
3. Import your product catalog
4. Set up your shipping preferences
5. Configure notification settings

Your Pazar+ application is now ready for multi-platform e-commerce management! 🎉
