# VPS Deployment Guide for Pazar+

This guide will help you deploy Pazar+ on your Hetzner VPS.

## Prerequisites

- Ubuntu 20.04+ or CentOS 8+ VPS
- Root or sudo access
- Domain name (optional but recommended)

## Step 1: Initial Server Setup

### Update the system
```bash
sudo apt update && sudo apt upgrade -y
```

### Install required software
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

## Step 2: Database Setup

### Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE pazar_plus_prod;
CREATE USER pazar_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE pazar_plus_prod TO pazar_user;
\q
```

### Configure PostgreSQL for network access (if needed)
```bash
sudo nano /etc/postgresql/12/main/postgresql.conf
# Uncomment and modify: listen_addresses = 'localhost'

sudo nano /etc/postgresql/12/main/pg_hba.conf
# Add line: local   pazar_plus_prod   pazar_user   md5
```

## Step 3: Application Deployment

### Clone and setup application
```bash
# Create application directory
sudo mkdir -p /var/www/pazar-plus
sudo chown $USER:$USER /var/www/pazar-plus

# Clone your repository
cd /var/www/pazar-plus
git clone https://github.com/your-username/pazar-plus.git .

# Run deployment script
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Configure environment variables
```bash
# Copy and edit production environment
cp .env.production .env
nano .env

# Update the following variables:
# DB_PASSWORD=your_secure_password
# JWT_SECRET=your_super_secure_jwt_secret
# SESSION_SECRET=your_session_secret
# CLIENT_URL=https://your-domain.com
# SMTP configuration for email features
```

## Step 4: Nginx Configuration

### Setup Nginx
```bash
# Copy nginx template
sudo cp nginx.conf.template /etc/nginx/sites-available/pazar-plus

# Edit the configuration
sudo nano /etc/nginx/sites-available/pazar-plus
# Replace YOUR_DOMAIN with your actual domain
# Replace YOUR_VPS_IP with your VPS IP
# Update the root path to: /var/www/pazar-plus/client/build

# Enable the site
sudo ln -s /etc/nginx/sites-available/pazar-plus /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: SSL Certificate (Optional but Recommended)

### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Step 6: Start the Application

### Start with PM2
```bash
cd /var/www/pazar-plus
npm run pm2:start

# Check status
pm2 status

# View logs
pm2 logs pazar-plus

# Save PM2 process list for auto-restart
pm2 save
pm2 startup
```

### Setup Systemd Service (Optional)
```bash
# Copy and edit service template
sudo cp pazar-plus.service.template /etc/systemd/system/pazar-plus.service
sudo nano /etc/systemd/system/pazar-plus.service
# Update paths and user settings

# Enable and start service
sudo systemctl enable pazar-plus
sudo systemctl start pazar-plus
sudo systemctl status pazar-plus
```

## Step 7: Firewall Configuration

### Configure UFW (Ubuntu)
```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

## Step 8: Monitoring and Maintenance

### Setup log rotation
```bash
sudo nano /etc/logrotate.d/pazar-plus
```

Add content:
```
/var/www/pazar-plus/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reload pazar-plus
    endscript
}
```

### Backup script
```bash
#!/bin/bash
# backup-pazar.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U pazar_user -h localhost pazar_plus_prod > /var/backups/pazar-plus-db-$DATE.sql
tar -czf /var/backups/pazar-plus-files-$DATE.tar.gz /var/www/pazar-plus/uploads

# Keep only last 7 days of backups
find /var/backups -name "pazar-plus-*" -mtime +7 -delete
```

## Step 9: Post-Deployment Verification

### Check application status
```bash
# Check if app is running
pm2 status

# Check app logs
pm2 logs pazar-plus

# Check Nginx status
sudo systemctl status nginx

# Check database connection
psql -U pazar_user -d pazar_plus_prod -h localhost -c "SELECT 1;"
```

### Test the application
- Visit your domain in a browser
- Test API endpoints: `curl http://your-domain.com/api/health`
- Check admin login functionality
- Test platform integrations

## Useful Commands

### Application Management
```bash
# Restart application
npm run pm2:restart

# Stop application
npm run pm2:stop

# View logs
npm run pm2:logs

# Update application
git pull
npm install
cd client && npm install && npm run build && cd ..
npm run pm2:restart
```

### System Monitoring
```bash
# Check system resources
htop
df -h
free -m

# Check application process
ps aux | grep node

# Check port usage
sudo netstat -tulpn | grep :5001
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL service: `sudo systemctl status postgresql`
   - Verify credentials in .env file
   - Check pg_hba.conf configuration

2. **Port Already in Use**
   - Find process using port: `sudo lsof -i :5001`
   - Kill process: `sudo kill -9 PID`

3. **Build Errors**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

4. **SSL Certificate Issues**
   - Check certificate status: `sudo certbot certificates`
   - Renew certificate: `sudo certbot renew`

5. **High Memory Usage**
   - Adjust PM2 max_memory_restart in ecosystem.config.js
   - Monitor with: `pm2 monit`

## Security Checklist

- [ ] SSH key-based authentication enabled
- [ ] Root login disabled
- [ ] Firewall configured and enabled
- [ ] SSL certificate installed
- [ ] Database credentials secured
- [ ] JWT and session secrets are random and secure
- [ ] Regular backups scheduled
- [ ] Log monitoring setup
- [ ] Application updates automated

## Support

For issues and support:
1. Check the application logs: `pm2 logs pazar-plus`
2. Check system logs: `sudo journalctl -u pazar-plus`
3. Review this documentation
4. Contact development team with logs and error details
