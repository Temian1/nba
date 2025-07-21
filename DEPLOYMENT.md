# NBA Props Analysis Platform - Production Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ database
- PM2 for process management (optional but recommended)
- Nginx for reverse proxy (optional)

## Environment Setup

1. **Copy environment configuration:**
   ```bash
   cp .env.production .env.local
   ```

2. **Update environment variables in `.env.local`:**
   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/nba_props
   
   # Authentication (Generate a secure 32+ character secret)
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
   
   # Application URLs
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   
   # NBA API Configuration
   NBA_API_KEY=your-nba-api-key-here
   
   # Cron Job Security (Generate a secure secret)
   CRON_SECRET=your-cron-secret-key-for-api-endpoints
   ```

## Database Setup

1. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE nba_props;
   CREATE USER nba_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE nba_props TO nba_user;
   ```

2. **Run database migrations:**
   ```bash
   npm run db:push
   ```

3. **Initial data sync:**
   ```bash
   node scripts/daily-sync.js
   ```

## Application Deployment

### Option 1: PM2 (Recommended)

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Create PM2 ecosystem file (`ecosystem.config.js`):**
   ```javascript
   module.exports = {
     apps: [{
       name: 'nba-props-app',
       script: 'npm',
       args: 'start',
       cwd: '/path/to/your/app',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       instances: 'max',
       exec_mode: 'cluster',
       watch: false,
       max_memory_restart: '1G',
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   };
   ```

4. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Option 2: Direct Node.js

1. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

## Automated Data Synchronization

### Setup Cron Jobs

1. **Edit crontab:**
   ```bash
   crontab -e
   ```

2. **Add cron jobs:**
   ```bash
   # Daily stats sync at 2 AM EST (7 AM UTC)
   0 7 * * * cd /path/to/your/app && node scripts/daily-sync.js >> logs/daily-sync.log 2>&1
   
   # Rolling splits computation at 3 AM EST (8 AM UTC)
   0 8 * * * cd /path/to/your/app && node scripts/sync-rolling-splits.js >> logs/rolling-splits.log 2>&1
   
   # Health check every 5 minutes
   */5 * * * * curl -f http://localhost:3000/api/health || echo "Health check failed at $(date)" >> logs/health-check.log
   ```

### Alternative: API-based Cron Jobs

You can also use external cron services (like cron-job.org) to trigger API endpoints:

```bash
# Rolling splits computation
curl -X POST http://your-domain.com/api/cron/sync-rolling-splits \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Nginx Configuration (Optional)

Create `/etc/nginx/sites-available/nba-props`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
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
    
    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/nba-props /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Logging

### Log Files

Create log directories:
```bash
mkdir -p logs
```

Log files will be created in:
- `logs/daily-sync.log` - Daily data synchronization
- `logs/rolling-splits.log` - Rolling splits computation
- `logs/health-check.log` - Health check results
- `logs/err.log` - Application errors (PM2)
- `logs/out.log` - Application output (PM2)

### Health Monitoring

The application provides a health check endpoint:
```bash
curl http://localhost:3000/api/health
```

Response includes:
- Database connectivity
- Recent data availability
- Memory usage
- Application uptime

## Security Considerations

1. **Environment Variables:**
   - Use strong, unique secrets for JWT_SECRET and CRON_SECRET
   - Never commit `.env.local` to version control

2. **Database Security:**
   - Use a dedicated database user with minimal privileges
   - Enable SSL for database connections in production

3. **API Security:**
   - Cron endpoints are protected with bearer token authentication
   - Rate limiting should be implemented at the reverse proxy level

4. **HTTPS:**
   - Always use HTTPS in production
   - Configure proper SSL certificates

## Backup Strategy

1. **Database Backups:**
   ```bash
   # Daily backup script
   pg_dump -h localhost -U nba_user nba_props > backup_$(date +%Y%m%d).sql
   ```

2. **Application Backups:**
   - Backup environment configuration
   - Backup custom scripts and configurations

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   - Check DATABASE_URL format
   - Verify database credentials
   - Ensure PostgreSQL is running

2. **Cron Jobs Not Running:**
   - Check crontab syntax
   - Verify file paths in cron commands
   - Check log files for errors

3. **Memory Issues:**
   - Monitor application memory usage
   - Adjust PM2 max_memory_restart if needed
   - Consider adding swap space

### Log Analysis

```bash
# View recent application logs
pm2 logs nba-props-app --lines 100

# Monitor real-time logs
tail -f logs/daily-sync.log

# Check for errors
grep -i error logs/*.log
```

## Performance Optimization

1. **Database Indexing:**
   - Ensure proper indexes are created (handled by migrations)
   - Monitor query performance

2. **Caching:**
   - Consider implementing Redis for caching
   - Use Next.js built-in caching features

3. **Resource Monitoring:**
   - Monitor CPU and memory usage
   - Set up alerts for high resource usage

## Updates and Maintenance

1. **Application Updates:**
   ```bash
   git pull origin main
   npm install
   npm run build
   pm2 restart nba-props-app
   ```

2. **Database Migrations:**
   ```bash
   npm run db:push
   ```

3. **Dependency Updates:**
   ```bash
   npm audit
   npm update
   ```