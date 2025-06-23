# 🔧 Environment Configuration for Pazar+

This directory contains scripts and templates for setting up your Pazar+ environment.

## 📁 Files Overview

- **`.env.example`** - Complete environment template with all configuration options
- **`setup-env.sh`** - Interactive script to create and configure `.env` file
- **`validate-env.js`** - Validates your environment configuration
- **`init-database.sh`** - Database initialization script for deployment

## 🚀 Quick Setup

### 1. Create Environment File

```bash
# Interactive setup (recommended)
./setup-env.sh

# Or manual setup
cp .env.example .env
# Then edit .env with your configuration
```

### 2. Validate Configuration

```bash
node validate-env.js
```

### 3. Initialize Database

```bash
./init-database.sh
```

### 4. Start Application

```bash
npm start
```

## 🔐 Security Requirements

### Required Secrets

Your `.env` file must include these secure secrets:

- **`JWT_SECRET`** - At least 32 characters for JWT token signing
- **`ENCRYPTION_KEY`** - Exactly 32 characters for data encryption
- **`SESSION_SECRET`** - At least 32 characters for session security
- **`DB_PASSWORD`** - Strong database password

### Generating Secure Secrets

```bash
# Generate a 64-character secret
openssl rand -base64 64 | tr -d "=+/" | cut -c1-64

# Generate a 32-character key
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

## 🗃️ Database Configuration

### Development (Default)

```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_NAME=pazar_plus
DB_USER=pazar_user
DB_PASSWORD=your_password
```

### Production

```env
DB_DIALECT=postgres
DB_HOST=your-db-host.com
DB_NAME=pazar_plus_prod
DB_USER=pazar_prod_user
DB_PASSWORD=strong_production_password
DB_SSL=true
```

## 🔌 Platform Integration

### Required for Each Marketplace

**Trendyol:**

```env
ENABLE_TRENDYOL=true
TRENDYOL_API_KEY=your_api_key
TRENDYOL_API_SECRET=your_secret
TRENDYOL_SELLER_ID=your_seller_id
```

**Hepsiburada:**

```env
ENABLE_HEPSIBURADA=true
HEPSIBURADA_API_KEY=your_api_key
HEPSIBURADA_API_SECRET=your_secret
HEPSIBURADA_MERCHANT_ID=your_merchant_id
```

**N11:**

```env
ENABLE_N11=true
N11_API_KEY=your_api_key
N11_API_SECRET=your_secret
N11_COMPANY_CODE=your_company_code
```

## 🏢 Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DB_SSL=true
RATE_LIMIT_ENABLED=true
REDIS_ENABLED=true
LOG_LEVEL=info
ENABLE_SWAGGER=false
```

### Security Checklist

- [ ] Strong database password
- [ ] SSL enabled for database
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] API keys from production marketplace accounts
- [ ] Real email/SMS service credentials
- [ ] Proper logging configuration

## 🛠️ Troubleshooting

### Common Issues

**Environment validation fails:**

```bash
# Check what's missing
node validate-env.js

# Fix interactively
./setup-env.sh
```

**Database connection fails:**

```bash
# Test connection
node test-connection.js

# Check credentials in .env
grep DB_ .env
```

**API integration issues:**

```bash
# Verify API keys are set
grep -E "(TRENDYOL|HEPSIBURADA|N11)_API_KEY" .env
```

### Getting Help

1. **Check validation output**: `node validate-env.js`
2. **Review deployment guide**: `DEPLOYMENT_GUIDE.md`
3. **Test database connection**: `node test-connection.js`
4. **Check application logs**: `tail -f logs/app-$(date +%Y-%m-%d).log`

## 📚 Configuration Reference

See `.env.example` for complete list of all available configuration options including:

- Database settings
- Authentication & security
- Platform API keys
- Payment integration (Stripe, Iyzico)
- Turkish compliance (e-Fatura)
- Email/SMS services
- Shipping providers
- Feature flags
- Performance tuning

Each section in `.env.example` includes detailed comments explaining the purpose and recommended values for each setting.
