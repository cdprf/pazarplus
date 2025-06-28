# 🗄️ Neon PostgreSQL Setup for Vercel Deployment

## Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Click "Create Project"
4. Choose:
   - **Project name**: `pazar-plus-db` (or any name you prefer)
   - **Database name**: `neondb` (default)
   - **Region**: Choose closest to your users
5. Click "Create Project"

## Step 2: Get Connection Details

After creating the project, you'll see your connection string:

```
postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Important**: Copy this exact connection string!

## Step 3: Configure Vercel Environment Variables

In your Vercel dashboard:

1. Go to your project
2. Click "Settings" tab
3. Click "Environment Variables"
4. Add these variables:

### Required Variables:

```env
DB_TYPE=postgres
DATABASE_URL=postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-random-secret-key-here
NODE_ENV=production
```

### Generate JWT Secret:
```bash
# Run this command to generate a secure JWT secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Optional Variables (for full functionality):

```env
HEPSIBURADA_USERNAME=your-username
HEPSIBURADA_PASSWORD=your-password
TRENDYOL_API_KEY=your-api-key
TRENDYOL_API_SECRET=your-api-secret
N11_API_KEY=your-api-key
N11_API_SECRET=your-api-secret
```

## Step 4: Deploy to Vercel

```bash
# Deploy your app
npm run deploy:vercel
```

## Step 5: Verify Database Connection

After deployment:

1. Visit your Vercel app URL
2. Register a new user (this will create database tables automatically)
3. Check Vercel function logs for any database connection issues

## 🔧 Neon Configuration Benefits

### ✅ **Optimized for Serverless**
- Connection pooling handled automatically
- No connection limits for free tier
- Instant wake from sleep

### ✅ **SSL by Default**
- Secure connections required
- No additional SSL configuration needed

### ✅ **Automatic Scaling**
- Scales to zero when not in use
- Instant scaling on demand

### ✅ **Generous Free Tier**
- 0.5 GB storage
- 100 hours compute time per month
- Perfect for demos and testing

## 🐛 Troubleshooting

### Database Connection Error

1. **Check Connection String Format**
   ```env
   # Correct format:
   DATABASE_URL=postgresql://username:password@host/database?sslmode=require
   
   # Make sure to include ?sslmode=require at the end
   ```

2. **Verify Environment Variables**
   - Check Vercel dashboard environment variables
   - Ensure no extra spaces or characters
   - Redeploy after adding variables

3. **Check Neon Dashboard**
   - Verify database is active (not suspended)
   - Check connection details are correct

### Tables Not Created

If tables aren't created automatically:

1. Check Vercel function logs
2. Verify database permissions
3. Try creating a user account (triggers table creation)

### Connection Timeout

If you get timeout errors:

1. Check Neon database region (choose closer region)
2. Verify SSL configuration in connection string
3. Check Vercel function timeout limits

## 📊 Database Schema

Your Pazar+ app will automatically create these tables:

- `Users` - User accounts and authentication
- `Products` - Product catalog
- `Orders` - Order management
- `Customers` - Customer information
- `CustomerQuestions` - Customer inquiries
- `PlatformConnections` - Marketplace integrations
- `AnalyticsData` - Analytics and reporting data

## 🚀 Production Tips

### Performance Optimization:
1. **Connection Pooling**: Already configured for Neon
2. **Query Optimization**: Indexes already included
3. **Caching**: Consider adding Redis for better performance

### Monitoring:
1. **Neon Dashboard**: Monitor database usage
2. **Vercel Analytics**: Track function performance
3. **Application Logs**: Check for database errors

---

## ✅ Ready to Deploy!

Your Neon PostgreSQL database is now configured for Vercel deployment. The connection will be automatically established when your app starts, and all tables will be created on first use.

**Next**: Run `npm run deploy:vercel` to deploy your app!
