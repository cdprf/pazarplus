# Deployment Guide

![Deployment](https://img.shields.io/badge/deployment-production%20ready-success.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20VPS-blue.svg)
![Monitoring](https://img.shields.io/badge/monitoring-PM2-orange.svg)

Comprehensive deployment guide for the Pazar+ Platform, covering development, staging, and production environments.

## Overview

This guide provides step-by-step instructions for deploying Pazar+ in various environments, from local development to production-ready VPS deployments.

## Deployment Architecture

```
Production Architecture:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Application   │    │   PostgreSQL    │
│   (Port 80/443) │────│   (Port 3000)   │────│   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │              ┌─────────────────┐
         │                       │              │      Redis      │
         │                       └──────────────│   (Port 6379)   │
         │                                      └─────────────────┘
┌─────────────────┐
│   React Client  │
│   (Port 3001)   │
└─────────────────┘
```

## Prerequisites

### System Requirements

**Minimum Requirements**:
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- OS: Ubuntu 20.04+ / AlmaLinux 8+ / CentOS 8+

**Recommended Requirements**:
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- OS: Ubuntu 22.04 LTS / AlmaLinux 9

### Software Dependencies

```bash
# Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL (v12+)
sudo apt-get install postgresql postgresql-contrib

# Redis (v6+)
sudo apt-get install redis-server

# Nginx
sudo apt-get install nginx

# PM2 (Process Manager)
sudo npm install -g pm2

# Git
sudo apt-get install git
```

## Environment Setup

### 1. Local Development

#### Clone and Setup
```bash
# Clone repository
git clone https://github.com/Great0S/pazar-.git
cd pazar+

# Install dependencies
npm run install:all

# Setup environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

#### Database Setup
```bash
# Create PostgreSQL database
sudo -u postgres createdb pazar_plus_dev
sudo -u postgres createuser pazar_dev_user

# Grant permissions
sudo -u postgres psql -c "ALTER USER pazar_dev_user WITH PASSWORD 'dev_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pazar_plus_dev TO pazar_dev_user;"
```

#### Environment Configuration
**server/.env**:
```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pazar_plus_dev
DB_USER=pazar_dev_user
DB_PASSWORD=dev_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Session
SESSION_SECRET=your_session_secret_here

# Enable debug logging
DEBUG=pazar:*
```

**client/.env**:
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=ws://localhost:3000
REACT_APP_ENV=development
```

#### Start Development Environment
```bash
# Start all services
npm run dev

# Or start individually
npm run server  # Backend only
npm run client  # Frontend only
```

### 2. Staging Environment

#### VPS Setup (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget git nginx postgresql postgresql-contrib redis-server

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

#### Database Configuration
```bash
# Configure PostgreSQL
sudo -u postgres psql << EOF
CREATE DATABASE pazar_plus_staging;
CREATE USER pazar_staging_user WITH PASSWORD 'secure_staging_password';
GRANT ALL PRIVILEGES ON DATABASE pazar_plus_staging TO pazar_staging_user;
ALTER USER pazar_staging_user CREATEDB;
\q
EOF

# Configure PostgreSQL settings
sudo nano /etc/postgresql/14/main/postgresql.conf
# Add/modify:
# listen_addresses = 'localhost'
# max_connections = 100

sudo systemctl restart postgresql
```

#### Application Deployment
```bash
# Create application directory
sudo mkdir -p /var/www/pazar-plus
sudo chown $USER:$USER /var/www/pazar-plus

# Clone application
cd /var/www/pazar-plus
git clone https://github.com/Great0S/pazar-.git .

# Install dependencies
npm run install:all

# Build client
cd client && npm run build
cd ..

# Setup environment
cp server/.env.example server/.env.staging
```

#### Environment Configuration
**server/.env.staging**:
```env
NODE_ENV=staging
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pazar_plus_staging
DB_USER=pazar_staging_user
DB_PASSWORD=secure_staging_password

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_strong_jwt_secret_here
SESSION_SECRET=your_strong_session_secret_here

# Platform APIs (staging keys)
TRENDYOL_API_KEY=staging_trendyol_key
HEPSIBURADA_API_KEY=staging_hepsiburada_key
N11_API_KEY=staging_n11_key

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/pazar/staging.log
```

#### Nginx Configuration
```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/pazar-plus-staging

# Add configuration:
server {
    listen 80;
    server_name staging.yourdomain.com;

    # Client (React build)
    location / {
        root /var/www/pazar-plus/client/build;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (shipping labels, etc.)
    location /shipping/ {
        alias /var/www/pazar-plus/server/uploads/shipping/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/pazar-plus-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### PM2 Configuration
```bash
# Create PM2 ecosystem file
nano /var/www/pazar-plus/ecosystem.staging.js
```

**ecosystem.staging.js**:
```javascript
module.exports = {
  apps: [{
    name: 'pazar-plus-staging',
    script: './server/server.js',
    cwd: '/var/www/pazar-plus',
    env: {
      NODE_ENV: 'staging',
      PORT: 3000
    },
    env_file: './server/.env.staging',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pazar/staging-error.log',
    out_file: '/var/log/pazar/staging-out.log',
    log_file: '/var/log/pazar/staging-combined.log',
    time: true
  }]
};
```

#### Start Staging Environment
```bash
# Create log directory
sudo mkdir -p /var/log/pazar
sudo chown $USER:$USER /var/log/pazar

# Start with PM2
pm2 start ecosystem.staging.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 3. Production Environment

#### Automated VPS Setup
Use the provided automated setup script:

```bash
# Download and run setup script
wget https://raw.githubusercontent.com/Great0S/pazar-/main/quick-vps-setup-almalinux.sh
chmod +x quick-vps-setup-almalinux.sh
sudo ./quick-vps-setup-almalinux.sh
```

#### Manual Production Setup

**System Hardening**:
```bash
# Update system
sudo dnf update -y

# Install firewall
sudo dnf install -y firewalld
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Configure firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# Install fail2ban
sudo dnf install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

**SSL Certificate Setup**:
```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

**Production Database Setup**:
```bash
# Install PostgreSQL
sudo dnf install -y postgresql postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create production database
sudo -u postgres psql << EOF
CREATE DATABASE pazar_plus_prod;
CREATE USER pazar_user WITH PASSWORD 'very_secure_production_password';
GRANT ALL PRIVILEGES ON DATABASE pazar_plus_prod TO pazar_user;
ALTER USER pazar_user CREATEDB;
\q
EOF

# Configure PostgreSQL for production
sudo nano /var/lib/pgsql/data/postgresql.conf
# Modify:
# max_connections = 200
# shared_buffers = 128MB
# work_mem = 4MB
# maintenance_work_mem = 64MB

sudo nano /var/lib/pgsql/data/pg_hba.conf
# Add:
# local   pazar_plus_prod   pazar_user                md5

sudo systemctl restart postgresql
```

**Production Environment Configuration**:
**server/.env.production**:
```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pazar_plus_prod
DB_USER=pazar_user
DB_PASSWORD=very_secure_production_password
DB_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=extremely_secure_jwt_secret_min_32_chars
SESSION_SECRET=extremely_secure_session_secret_min_32_chars

# Platform APIs (production keys)
TRENDYOL_API_KEY=prod_trendyol_key
TRENDYOL_API_SECRET=prod_trendyol_secret
TRENDYOL_SELLER_ID=your_seller_id

HEPSIBURADA_USERNAME=prod_username
HEPSIBURADA_PASSWORD=prod_password
HEPSIBURADA_MERCHANT_ID=your_merchant_id

N11_API_KEY=prod_n11_key
N11_API_SECRET=prod_n11_secret

# Shipping
ARAS_API_URL=https://api.araskargo.com.tr
YURTICI_API_URL=https://api.yurticikargo.com

# Monitoring
LOG_LEVEL=warn
LOG_FILE=/var/log/pazar/production.log
ENABLE_METRICS=true

# Security Headers
HELMET_CSP=true
HELMET_HSTS=true
```

**Production Nginx Configuration**:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Client (React build)
    location / {
        root /var/www/pazar-plus/client/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files with proper caching
    location /shipping/ {
        alias /var/www/pazar-plus/server/uploads/shipping/;
        expires 1d;
        add_header Cache-Control "public";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Rate limiting zones
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
}
```

**Production PM2 Configuration**:
```javascript
module.exports = {
  apps: [{
    name: 'pazar-plus-prod',
    script: './server/server.js',
    cwd: '/var/www/pazar-plus',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: './server/.env.production',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/var/log/pazar/prod-error.log',
    out_file: '/var/log/pazar/prod-out.log',
    log_file: '/var/log/pazar/prod-combined.log',
    time: true,
    
    // Advanced PM2 features
    kill_timeout: 5000,
    listen_timeout: 3000,
    restart_delay: 1000,
    
    // Monitoring
    pmx: true,
    
    // Auto-restart on high memory usage
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

## Database Management

### Migrations and Seeding

**Database Migration**:
```bash
# Run migrations
cd /var/www/pazar-plus/server
npm run db:migrate

# Seed initial data
npm run db:seed
```

**Custom Migration Example**:
```sql
-- migrations/20250812_add_classification_index.sql
CREATE INDEX CONCURRENTLY idx_products_classification 
ON products (classification_type, classification_confidence);

CREATE INDEX CONCURRENTLY idx_orders_platform_date 
ON orders (platform, created_at);

-- Add constraint for classification confidence
ALTER TABLE products 
ADD CONSTRAINT check_classification_confidence 
CHECK (classification_confidence >= 0.0 AND classification_confidence <= 1.0);
```

### Backup Strategy

#### Automated Database Backups

**Daily Backup Script**:
```bash
#!/bin/bash
# /usr/local/bin/backup-pazar-db.sh

BACKUP_DIR="/var/backups/pazar"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="pazar_plus_prod"
DB_USER="pazar_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/pazar_backup_$DATE.sql.gz

# Remove backups older than 30 days
find $BACKUP_DIR -name "pazar_backup_*.sql.gz" -mtime +30 -delete

# Log backup completion
echo "$(date): Backup completed - pazar_backup_$DATE.sql.gz" >> /var/log/pazar/backup.log
```

**Cron Configuration**:
```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-pazar-db.sh

# Weekly full system backup at 3 AM Sunday
0 3 * * 0 tar -czf /var/backups/pazar/full_backup_$(date +\%Y\%m\%d).tar.gz /var/www/pazar-plus
```

#### Backup Restoration

**Restore from Backup**:
```bash
# Stop application
pm2 stop pazar-plus-prod

# Restore database
gunzip -c /var/backups/pazar/pazar_backup_20250812_020001.sql.gz | psql -h localhost -U pazar_user pazar_plus_prod

# Restart application
pm2 start pazar-plus-prod
```

## Monitoring and Logging

### Application Monitoring

**PM2 Monitoring**:
```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# View logs
pm2 logs pazar-plus-prod --lines 100

# Restart application
pm2 restart pazar-plus-prod

# Reload with zero downtime
pm2 reload pazar-plus-prod
```

**Log Rotation Configuration**:
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/pazar-plus

/var/log/pazar/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
```

### System Monitoring

**Health Check Script**:
```bash
#!/bin/bash
# /usr/local/bin/health-check.sh

# Check application health
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $APP_STATUS -ne 200 ]; then
    echo "$(date): Application health check failed (HTTP $APP_STATUS)" >> /var/log/pazar/health.log
    # Optional: restart application
    # pm2 restart pazar-plus-prod
fi

# Check database connection
DB_STATUS=$(sudo -u postgres psql -c "SELECT 1;" pazar_plus_prod 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "$(date): Database connection failed" >> /var/log/pazar/health.log
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "$(date): High disk usage: $DISK_USAGE%" >> /var/log/pazar/health.log
fi
```

**Cron for Health Checks**:
```bash
# Check every 5 minutes
*/5 * * * * /usr/local/bin/health-check.sh
```

## Security Considerations

### Application Security

**Environment Variables Protection**:
```bash
# Secure environment files
chmod 600 /var/www/pazar-plus/server/.env.production
chown $USER:$USER /var/www/pazar-plus/server/.env.production
```

**API Rate Limiting**:
```javascript
// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  authLimiter: createRateLimiter(15 * 60 * 1000, 5, 'Too many auth attempts'),
  apiLimiter: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'),
  strictLimiter: createRateLimiter(15 * 60 * 1000, 10, 'Rate limit exceeded')
};
```

### Server Security

**Firewall Configuration**:
```bash
# Configure firewall rules
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="0.0.0.0/0" port port="22" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="0.0.0.0/0" port port="80" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="0.0.0.0/0" port port="443" protocol="tcp" accept'
sudo firewall-cmd --reload
```

**SSH Hardening**:
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
Port 2222                    # Change default port
PermitRootLogin no          # Disable root login
PasswordAuthentication no   # Use key-based auth only
MaxAuthTries 3             # Limit auth attempts
ClientAliveInterval 300    # Timeout idle connections

sudo systemctl restart sshd
```

## Performance Optimization

### Application Optimization

**Node.js Performance Tuning**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable V8 optimizations
export NODE_OPTIONS="--optimize-for-size"
```

**Database Performance**:
```sql
-- Performance tuning queries
VACUUM ANALYZE;

-- Index optimization
CREATE INDEX CONCURRENTLY idx_orders_status_date ON orders (status, created_at);
CREATE INDEX CONCURRENTLY idx_products_sku_hash ON products USING hash (sku);

-- Update statistics
ANALYZE orders;
ANALYZE products;
```

**Redis Configuration**:
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Optimize for production
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Frontend Optimization

**Build Optimization**:
```bash
# Build with optimizations
cd client
npm run build

# Analyze bundle size
npm run analyze

# Pre-compress assets
find build -name "*.js" -exec gzip -k {} \;
find build -name "*.css" -exec gzip -k {} \;
```

## Troubleshooting Deployment Issues

### Common Issues

**Port Already in Use**:
```bash
# Find process using port 3000
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000

# Kill process if needed
sudo kill -9 <PID>
```

**Permission Issues**:
```bash
# Fix file permissions
sudo chown -R $USER:$USER /var/www/pazar-plus
sudo chmod -R 755 /var/www/pazar-plus

# Fix log permissions
sudo chown -R $USER:$USER /var/log/pazar
sudo chmod -R 644 /var/log/pazar/*.log
```

**Database Connection Issues**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U pazar_user -d pazar_plus_prod -c "SELECT version();"

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Rollback Procedures

**Application Rollback**:
```bash
# Stop current version
pm2 stop pazar-plus-prod

# Backup current version
mv /var/www/pazar-plus /var/www/pazar-plus-backup-$(date +%Y%m%d)

# Restore previous version
cp -r /var/www/pazar-plus-previous /var/www/pazar-plus

# Restart application
pm2 start pazar-plus-prod
```

**Database Rollback**:
```bash
# Stop application
pm2 stop pazar-plus-prod

# Restore database
pg_restore -h localhost -U pazar_user -d pazar_plus_prod /var/backups/pazar/pazar_backup_previous.sql

# Restart application
pm2 start pazar-plus-prod
```

## Maintenance Procedures

### Regular Maintenance Tasks

**Weekly Tasks**:
```bash
#!/bin/bash
# Weekly maintenance script

# Update system packages
sudo dnf update -y

# Clean old logs
find /var/log/pazar -name "*.log" -mtime +7 -delete

# Optimize database
sudo -u postgres psql pazar_plus_prod -c "VACUUM ANALYZE;"

# Restart services for memory cleanup
pm2 restart pazar-plus-prod

# Check SSL certificate expiry
certbot certificates
```

**Monthly Tasks**:
```bash
#!/bin/bash
# Monthly maintenance script

# Update Node.js dependencies
cd /var/www/pazar-plus
npm audit
npm update

# Rebuild client
cd client && npm run build

# Clean old backups (keep 90 days)
find /var/backups/pazar -name "*.sql.gz" -mtime +90 -delete

# Generate performance report
pm2 show pazar-plus-prod
```

This deployment guide provides comprehensive instructions for setting up Pazar+ in various environments. Always test deployments in staging before applying to production, and maintain regular backups of both application code and database.

To roll back a migration if needed:

```bash
npm run db:migrate:undo
```

## Backup Restoration

If you need to restore from a backup:

1. Stop the application server
2. Run the restore script:

```bash
cd /path/to/pazar+/services/order-management
npm run restore
```

3. Follow the interactive prompts to select which backup to restore
4. Restart the application server

## Health Monitoring

The application provides a health check endpoint at `/health` that can be used by monitoring services to verify the application is running correctly.

## Environment Variables

Configure the following environment variables in production:

- `NODE_ENV=production`
- `PORT=3001` (or your preferred port)
- `JWT_SECRET=<strong-random-secret>`
- `DB_STORAGE=/path/to/production-database.sqlite` (if using SQLite)
- `LOG_LEVEL=info`

## Performance Considerations

For high-traffic deployments:
- Consider implementing the recommendations in the Performance Optimization document
- Set up a Redis instance for caching and job queues
- Use PM2 for process management and clustering

## Security Best Practices

- Keep all packages updated
- Enable security headers via Helmet (already configured)
- Use HTTPS only in production
- Set up proper firewall rules
- Implement the authentication enhancement plan