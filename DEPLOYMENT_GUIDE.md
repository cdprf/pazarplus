# 🚀 Pazar+ Deployment Guide

## Quick Deployment for New Machine

### Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** database server
3. **Git** for cloning the repository

### Step 1: Clone and Setup

```bash
git clone <your-repo-url>
cd pazar+/server
```

### Step 2: Environment Configuration

Create `.env` file with your database configuration:

```env
NODE_ENV=production
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pazar_plus
DB_USER=pazar_user
DB_PASSWORD=your_secure_password

# Optional: For SSL connection
DB_SSL=true

# Application settings
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key

# External API keys (optional)
TRENDYOL_API_KEY=your_key
HEPSIBURADA_API_KEY=your_key
N11_API_KEY=your_key
```

### Step 3: Database Initialization

```bash
# Make the script executable
chmod +x init-database.sh

# Run the initialization script
./init-database.sh
```

That's it! 🎉

## What the `init-database.sh` Script Does

1. ✅ **Verifies Environment**: Checks if you're in the correct directory
2. ✅ **Installs Dependencies**: Runs `npm install` if needed
3. ✅ **Tests Database Connection**: Ensures your database is accessible
4. ✅ **Runs Migrations**: Applies the complete database schema
5. ✅ **Verifies Migration Status**: Shows before/after migration status
6. ✅ **Provides Next Steps**: Clear instructions for what to do next

## Database Schema Created

The migration will create **26 tables** including:

### Core Tables

- **users** - User accounts and authentication
- **platform_connections** - Marketplace API connections
- **subscriptions** - Billing and subscription management
- **settings** - User preferences and configuration

### Product Management

- **products** - Main product catalog
- **product_variants** - Product variations (size, color, etc.)
- **product_media** - Images and media files
- **product_templates** - Platform-specific product templates

### Order Management

- **orders** - Order transactions
- **order_items** - Individual order line items
- **shipping_details** - Shipping addresses and information

### Platform Integration

- **platform_data** - Platform-specific product data
- **platform_conflicts** - Data synchronization conflicts
- **platform_categories** - Marketplace category mappings
- **trendyol_products**, **hepsiburada_products**, **n11_products** - Platform-specific data

### Operations

- **background_tasks** - Async job processing
- **bulk_operations** - Batch processing operations
- **inventory_movements** - Stock level changes
- **inventory_sync** - Multi-platform inventory synchronization

### Financial & Compliance

- **invoices** - Invoice generation and tracking
- **usage_records** - Subscription usage tracking
- **shipping_carriers** - Shipping provider configuration
- **shipping_rates** - Shipping cost calculations
- **stock_reservations** - Inventory reservation system

## Migration Features

### ✅ **Enum Alignment**

- **OrderStatus**: 16 values including `new`, `pending`, `processing`, `shipped`, `delivered`, `cancelled`, etc.
- **Platform Types**: Support for Trendyol, Hepsiburada, N11, Amazon, and more
- **Task Types**: Background job categorization

### ✅ **Nullable Fields**

- **connectionId** in orders table is nullable (supports manual orders)
- Proper foreign key constraints with `SET NULL` behavior

### ✅ **Unique Constraints**

- Orders: Unique per platform connection
- Products: Unique SKU per user
- Settings: Unique key per user

### ✅ **Indexes**

- Performance-optimized indexes for common queries
- Multi-column indexes for complex filtering
- Unique indexes for data integrity

## Rollback Support

If you need to rollback the migration:

```bash
# Undo the last migration
npx sequelize-cli db:migrate:undo

# Check migration status
npx sequelize-cli db:migrate:status

# Re-apply migrations
npx sequelize-cli db:migrate
```

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
node test-connection.js

# Check migration status
npx sequelize-cli db:migrate:status
```

### Common Issues

1. **Permission Denied**: Make sure the script is executable

   ```bash
   chmod +x init-database.sh
   ```

2. **Database Connection Failed**: Verify your `.env` file settings
   - Check database server is running
   - Verify credentials
   - Ensure database exists

3. **Migration Failed**: Check the error output
   - Usually indicates database permission issues
   - Or missing database/schema

### Production Deployment

For production environments:

1. **Create Database**: Ensure the PostgreSQL database exists
2. **Database User**: Create a dedicated user with proper permissions
3. **SSL**: Enable SSL connections in production
4. **Environment**: Set `NODE_ENV=production`
5. **Security**: Use strong passwords and secrets

### Example Production Database Setup

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE pazar_plus;
CREATE USER pazar_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE pazar_plus TO pazar_user;

-- Connect to the pazar_plus database
\c pazar_plus
GRANT ALL ON SCHEMA public TO pazar_user;
```

## Success Indicators

After running `./init-database.sh`, you should see:

- ✅ Database connection successful
- ✅ Dependencies installed
- ✅ Migration status showing applied migrations
- ✅ 26 tables created
- ✅ Ready to start the application

## Starting the Application

After successful database initialization:

```bash
# Start in production mode
npm start

# Or start in development mode
npm run dev

# The server will be available at:
# http://localhost:5001
```

Your Pazar+ application is now ready! 🎉
