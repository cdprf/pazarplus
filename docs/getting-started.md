# Getting Started Guide

![Setup](https://img.shields.io/badge/setup-quick%20start-blue.svg)
![Demo](https://img.shields.io/badge/demo-available-green.svg)
![Support](https://img.shields.io/badge/support-24%2F7-brightgreen.svg)

Welcome to Pazar+! This guide will help you get up and running with the platform quickly, whether you're setting up for development, testing, or production use.

## Quick Start Options

Choose your preferred way to get started:

### **Live Demo** (Fastest)
Test the platform immediately with our live demo:
- **URL**: [yarukai.com](https://yarukai.com)
- **Credentials**: 
  - Email: `admin@example.com`
  - Password: `FrVCxFsLb7Rfshn#`

### **Local Development** 
Set up a full development environment on your machine

### **Cloud Deployment**
Deploy to your own server or cloud provider

---

## Understanding Pazar+

### What is Pazar+?

Pazar+ is an advanced e-commerce order management platform that provides:

- **Intelligent Product Classification** - AI-powered SKU vs barcode detection
- **Multi-Platform Integration** - Connect to multiple marketplaces
- **Advanced Shipping Management** - Multi-language label generation
- **Real-time Synchronization** - Bidirectional data sync
- **Comprehensive Analytics** - Business insights and reporting

### Key Concepts

**Product Intelligence**:
```
Input: "ABC123-RED-L"
↓
AI Classification: SKU (92% confidence)
↓
Variant Detection: T-Shirt, Red, Large
↓
Result: Grouped with ABC123-* variants
```

**Platform Integration**:
```
Your Store ←→ Pazar+ ←→ Marketplace
           ↑           ↑
      Orders/Products  Orders/Products
```

**Workflow Example**:
1. Connect marketplace accounts
2. Import/sync products automatically
3. AI classifies and groups products
4. Orders flow in automatically
5. Generate shipping labels
6. Track and analyze performance

## Option 1: Live Demo

### Accessing the Demo

1. **Open your browser** and go to [yarukai.com](https://yarukai.com)

2. **Login with demo credentials**:
   ```
   Email: admin@example.com
   Password: FrVCxFsLb7Rfshn#
   ```

3. **Explore the platform**:
   - Dashboard with real-time metrics
   - Order management interface
   - Product classification system
   - Platform connections
   - Shipping label designer
   - Analytics and reports

### Demo Features Available

**Dashboard Overview**:
- Live order metrics
- Platform health status
- Product classification stats
- Recent activity feed

**Product Management**:
- View classified products
- See variant detection in action
- Test manual classification
- Export product data

**Order Processing**:
- Browse sample orders
- Update order statuses
- Generate test shipping labels
- View order analytics

**Platform Connections**:
- See configured demo platforms
- Test connection health
- Monitor sync status
- View platform-specific data

### Demo Limitations

⚠️ **Note**: The demo environment has these restrictions:
- Read-only for most operations
- Sample data only
- No real platform connections
- Limited customization options

## Option 2: Local Development Setup

### Prerequisites

Before starting, ensure you have:

- **Node.js** v18.0.0 or higher
- **NPM** v8.0.0 or higher  
- **PostgreSQL** v12.0 or higher
- **Git** version control
- **Redis** v6.0 or higher (optional, for caching)

### Installation Steps

#### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/Great0S/pazar-.git

# Navigate to project directory
cd pazar+

# Check you're in the right place
ls -la
# You should see: client/ server/ docs/ package.json README.md
```

#### Step 2: Install Dependencies

```bash
# Install all dependencies (client + server)
npm run install:all

# Alternative: Install separately
npm install              # Root dependencies
cd client && npm install # Client dependencies
cd ../server && npm install # Server dependencies
cd ..
```

#### Step 3: Database Setup

**Install PostgreSQL** (if not already installed):

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS (with Homebrew)
brew install postgresql

# Windows - Download from postgresql.org
```

**Create Database and User**:

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE pazar_plus_dev;
CREATE USER pazar_dev_user WITH PASSWORD 'dev_password123';
GRANT ALL PRIVILEGES ON DATABASE pazar_plus_dev TO pazar_dev_user;
ALTER USER pazar_dev_user CREATEDB;

# Exit PostgreSQL
\q
```

#### Step 4: Environment Configuration

**Server Configuration**:
```bash
# Copy environment template
cp server/.env.example server/.env

# Edit the file
nano server/.env
```

**server/.env**:
```env
# Application
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pazar_plus_dev
DB_USER=pazar_dev_user
DB_PASSWORD=dev_password123
DB_SSL=false

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_development_jwt_secret_at_least_32_characters
SESSION_SECRET=your_development_session_secret_at_least_32_characters

# Development Settings
DEBUG=pazar:*
LOG_LEVEL=debug

# Demo Platform Keys (for testing)
DEMO_MODE=true
```

**Client Configuration**:
```bash
# Copy client environment template
cp client/.env.example client/.env

# Edit the file
nano client/.env
```

**client/.env**:
```env
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=ws://localhost:3000

# Environment
REACT_APP_ENV=development

# Features
REACT_APP_DEMO_MODE=true
REACT_APP_ENABLE_ANALYTICS=true
```

#### Step 5: Database Migration

```bash
# Navigate to server directory
cd server

# Run database migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed

# Return to root
cd ..
```

#### Step 6: Start Development Environment

**Option A: Start everything together**:
```bash
npm run dev
```

**Option B: Start services separately**:
```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run client
```

#### Step 7: Verify Installation

**Check Backend**:
```bash
# Test API health
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-08-12T10:30:00Z"
}
```

**Check Frontend**:
- Open browser to `http://localhost:3001`
- You should see the Pazar+ login page
- Login with development credentials

**Test Database Connection**:
```bash
# Connect to your development database
psql -h localhost -U pazar_dev_user -d pazar_plus_dev

# Run a test query
SELECT current_database(), current_user;

# Exit
\q
```

### Development Workflow

#### Daily Development Routine

1. **Start Development Environment**:
   ```bash
   npm run dev
   ```

2. **Check Health Status**:
   - Backend: `http://localhost:3000/api/health`
   - Frontend: `http://localhost:3001`

3. **View Logs**:
   ```bash
   # Backend logs
   npm run server:logs
   
   # Or view in browser dev tools (Network tab)
   ```

4. **Run Tests**:
   ```bash
   # Run all tests
   npm test
   
   # Run specific test suite
   npm test -- --grep "Product Classification"
   ```

#### Making Changes

**Backend Changes**:
- Edit files in `server/` directory
- Server automatically restarts (nodemon)
- Check console for errors

**Frontend Changes**:
- Edit files in `client/src/` directory  
- Browser automatically refreshes
- Check browser console for errors

**Database Changes**:
```bash
# Create new migration
cd server
npm run migration:create -- add_new_feature

# Run migrations
npm run db:migrate

# Rollback if needed
npm run db:rollback
```

### Common Development Issues

**Port Already in Use**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run server
```

**Database Connection Failed**:
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Start if stopped
sudo service postgresql start

# Check credentials in .env file
```

**Module Not Found Errors**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules server/node_modules
npm run install:all
```

## Option 3: Cloud Deployment

### Quick VPS Deployment

For a production-ready deployment, use our automated setup script:

```bash
# On your VPS (Ubuntu/AlmaLinux)
wget https://raw.githubusercontent.com/Great0S/pazar-/main/quick-vps-setup-almalinux.sh
chmod +x quick-vps-setup-almalinux.sh
sudo ./quick-vps-setup-almalinux.sh
```

This script will:
- Install all required dependencies
- Set up PostgreSQL database
- Configure Nginx reverse proxy
- Set up SSL certificates
- Configure PM2 process manager
- Start the application

### Manual Cloud Setup

For custom deployments, follow the [Deployment Guide](./deployment-guide.md).

### Docker Deployment

**Using Docker Compose**:
```bash
# Clone repository
git clone https://github.com/Great0S/pazar-.git
cd pazar+

# Start with Docker
docker-compose up -d

# Check status
docker-compose ps
```

## First Steps After Installation

### 1. Create Your First User Account

**Via API** (if no accounts exist):
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "your@email.com", 
    "password": "securepassword123"
  }'
```

**Via Web Interface**:
- Go to the registration page
- Fill in your details
- Verify email (if configured)

### 2. Configure Basic Settings

**Access Settings**:
- Login to your account
- Navigate to **Settings > General**
- Configure:
  - Company information
  - Default currency
  - Time zone
  - Language preferences

### 3. Set Up Your First Platform Connection

**Navigate to Platform Connections**:
- Go to **Settings > Platform Connections**
- Click **"Add New Connection"**

**For Testing (CSV Import)**:
```bash
# Create a test CSV file
echo "sku,name,price,stock" > test_products.csv
echo "ABC123,Test Product 1,29.99,100" >> test_products.csv
echo "DEF456,Test Product 2,39.99,50" >> test_products.csv

# Import via UI: Products > Import > Upload CSV
```

**For Marketplace Integration**:
- Choose your platform (Trendyol, Hepsiburada, N11)
- Enter API credentials
- Test connection
- Configure sync settings

### 4. Import Your First Products

**Manual Product Creation**:
- Go to **Products > Add New**
- Fill in product details
- Save and observe AI classification

**Bulk Import**:
- Prepare CSV file with your products
- Go to **Products > Import**
- Upload file and map columns
- Review and confirm import

### 5. Test Product Classification

**View Classification Results**:
- Go to **Products > Catalog**
- Look for classification badges (SKU/Barcode)
- Check confidence scores

**Test Specific Products**:
```bash
# Test via API
curl -X POST http://localhost:3000/api/products/classify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "products": [
      {"id": "test1", "sku": "ABC123", "name": "Test Product"},
      {"id": "test2", "sku": "1234567890123", "name": "Barcode Product"}
    ]
  }'
```

### 6. Create Your First Order

**Manual Order Creation**:
- Go to **Orders > Create New**
- Fill in customer details
- Add products
- Set shipping address
- Save order

**Test Order Processing**:
- Update order status
- Generate shipping label
- Test tracking integration

### 7. Generate Your First Shipping Label

**Create Label**:
- Open any order
- Click **"Generate Shipping Label"**
- Select template and carrier
- Download PDF

**Customize Label Template**:
- Go to **Settings > Shipping Templates**
- Edit default template
- Test with sample data

## Understanding the Interface

### Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  Header: Logo | Navigation | User Menu             │
├─────────────────┬───────────────────────────────────┤
│  Sidebar:       │  Main Content Area:               │
│  • Dashboard    │  ┌─────────────────────────────┐   │
│  • Orders       │  │  Metrics Cards              │   │
│  • Products     │  ├─────────────────────────────┤   │
│  • Platforms    │  │  Charts & Graphs            │   │
│  • Shipping     │  ├─────────────────────────────┤   │
│  • Analytics    │  │  Recent Activity            │   │
│  • Settings     │  └─────────────────────────────┘   │
└─────────────────┴───────────────────────────────────┘
```

### Key Interface Elements

**Metrics Cards**:
- Order count and growth
- Revenue and trends  
- Product classification stats
- Platform sync status

**Data Tables**:
- Sortable columns
- Search and filter options
- Bulk action checkboxes
- Pagination controls

**Forms**:
- Real-time validation
- Auto-save capabilities
- Help tooltips
- Progress indicators

### Navigation Tips

**Keyboard Shortcuts**:
- `Ctrl + /` - Search orders/products
- `Ctrl + N` - Create new (context-dependent)
- `Ctrl + S` - Save current form
- `Esc` - Close modals/dropdowns

**Quick Actions**:
- Right-click on orders for context menu
- Hover over products for quick actions
- Use bulk select for mass operations

## Learning Resources

### Documentation

- **[API Reference](./api-reference.md)** - Complete API documentation
- **[User Guide](./user-guide.md)** - Detailed feature explanations
- **[Platform Integration](./platform-integration.md)** - Marketplace setup
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

### Video Tutorials

**Getting Started Series**:
1. Platform Overview (5 min)
2. Setting Up Your First Connection (10 min)
3. Product Classification Explained (8 min)
4. Order Management Walkthrough (12 min)
5. Shipping Labels and Tracking (7 min)

### Example Data

**Sample Product CSV**:
```csv
sku,name,description,price,stock,category,barcode
ABC123,Wireless Headphones,Premium bluetooth headphones,99.99,50,Electronics,1234567890123
DEF456-RED-S,Red T-Shirt Small,Cotton t-shirt in red small,19.99,25,Clothing,
DEF456-RED-M,Red T-Shirt Medium,Cotton t-shirt in red medium,19.99,30,Clothing,
GHI789,USB Cable,USB-C charging cable,9.99,100,Accessories,9876543210987
```

**Sample Order Data**:
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1-555-0123",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York", 
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "items": [
    {
      "sku": "ABC123",
      "quantity": 1,
      "unitPrice": 99.99
    }
  ]
}
```

## Next Steps

### Beginner Path
1. ✅ Set up development environment
2. ✅ Create first user account
3. ⬜ Import sample products
4. ⬜ Test product classification
5. ⬜ Create sample orders
6. ⬜ Generate shipping labels
7. ⬜ Explore analytics dashboard

### Intermediate Path
1. ⬜ Connect real marketplace account
2. ⬜ Set up automated synchronization
3. ⬜ Customize shipping templates
4. ⬜ Configure webhook notifications
5. ⬜ Set up automated backups
6. ⬜ Optimize platform performance

### Advanced Path
1. ⬜ Deploy to production environment
2. ⬜ Implement custom integrations
3. ⬜ Set up monitoring and alerts
4. ⬜ Customize classification rules
5. ⬜ Develop custom reports
6. ⬜ Scale for high volume

## Getting Help

### Community Support
- **GitHub Issues**: Report bugs and request features
- **Community Forum**: Ask questions and share experiences
- **Documentation**: Comprehensive guides and references

### Professional Support
- **Email**: greatos@outlook.com

### Self-Service Resources
- **Knowledge Base**: Searchable help articles
- **Video Library**: Step-by-step tutorials
- **API Explorer**: Interactive API testing
- **System Status**: Real-time service health

---

**Congratulations!** You're now ready to start using Pazar+. Begin with the live demo to get familiar with the interface, then set up your development environment for customization, or deploy directly to production for immediate use.

For any questions during setup, refer to our [Troubleshooting Guide](./troubleshooting.md) or contact our support team.
