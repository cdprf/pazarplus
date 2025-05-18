# Pazar+ Deployment and Backup Guide

This document provides instructions for deploying the Pazar+ Order Management Service and setting up automated backups.

## Deployment Overview

The Order Management Service is designed to be deployed as a standalone service. In production, consider the following configuration:

- Use a production-grade database (PostgreSQL recommended)
- Deploy behind a reverse proxy like Nginx
- Set up proper SSL certificates for security
- Configure environment variables for sensitive information

## Automated Backup Configuration

### Linux/macOS (Using Cron)

1. Open the crontab configuration:

```bash
crontab -e
```

2. Add a daily backup schedule (runs at 2 AM):

```
0 2 * * * cd /path/to/pazar+/services/order-management && npm run backup >> /path/to/pazar+/services/order-management/logs/backup.log 2>&1
```

3. Save and exit

### Windows (Using Task Scheduler)

1. Open Task Scheduler
2. Create a new Basic Task
   - Name: "Pazar+ Daily Backup"
   - Trigger: Daily at 2:00 AM
   - Action: Start a Program
   - Program/script: `cmd.exe`
   - Arguments: `/c cd /path/to/pazar+/services/order-management && npm run backup >> logs/backup.log 2>&1`

## Database Migration

When upgrading the application, run database migrations:

```bash
cd /path/to/pazar+/services/order-management
npm run db:migrate
```

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