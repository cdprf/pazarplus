# Render Deployment Guide for Pazar+

## Why Render is Better Than Vercel for Your App

✅ **Full Express.js Support** - No need to modify your app structure  
✅ **WebSocket Support** - Real-time features work out of the box  
✅ **Background Processes** - Persistent connections and scheduled tasks  
✅ **Traditional Server** - No serverless limitations  
✅ **Easier Configuration** - Simple YAML configuration  

## Deployment Steps

### 1. Commit Your Changes

```bash
git add .
git commit -m "Add Render configuration"
git push origin main
```

### 2. Deploy to Render

#### Option A: Using Render Dashboard (Recommended)
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to create both frontend and backend services

#### Option B: Manual Service Creation
1. **Backend Service:**
   - Type: Web Service
   - Repository: Your GitHub repo
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

2. **Frontend Service:**
   - Type: Static Site
   - Repository: Your GitHub repo
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `client/build`

### 3. Configure Environment Variables

In Render Dashboard → Your Backend Service → Environment:

**Required Variables:**
```
NODE_ENV=production
PORT=10000
```

**Add Your App-Specific Variables:**
```
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
HEPSIBURADA_API_KEY=your_key
TRENDYOL_API_KEY=your_key
N11_API_KEY=your_key
REDIS_URL=your_redis_url
```

### 4. Database Setup (If Needed)

If you need PostgreSQL:
1. In Render Dashboard → "New +" → "PostgreSQL"
2. Create database
3. Copy connection string to your backend service environment variables

### 5. Test Deployment

After deployment:
- **Backend:** `https://your-backend.onrender.com/health`
- **Frontend:** `https://your-frontend.onrender.com`
- **API:** `https://your-backend.onrender.com/api`

## Current Configuration (render.yaml)

Your app is configured with:
- **Backend:** Full Express.js server on port 10000
- **Frontend:** React static site with client-side routing
- **Health Check:** `/api/health` endpoint for monitoring
- **Auto-deploys:** On every git push to main branch

## Environment Variables to Set

Based on your app, you'll need to configure:

### Authentication & Security
- `JWT_SECRET` - For JWT token signing
- `SESSION_SECRET` - For session management
- `ENCRYPTION_KEY` - For data encryption

### Database
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (if using)

### E-commerce Platforms
- `HEPSIBURADA_API_KEY` & `HEPSIBURADA_SECRET`
- `TRENDYOL_API_KEY` & `TRENDYOL_SECRET`  
- `N11_API_KEY` & `N11_SECRET`

### Shipping & Payment
- `QNB_FINANS_API_KEY` & `QNB_FINANS_SECRET`
- `SHIPPING_API_KEY` - For shipping integrations

### Analytics & Monitoring
- `ANALYTICS_API_KEY` - If using external analytics
- `SENTRY_DSN` - For error tracking (optional)

## Benefits Over Vercel

1. **No Code Changes Required** - Your Express app works as-is
2. **WebSocket Support** - Real-time order updates work
3. **Background Jobs** - Order processing and sync tasks
4. **Database Connections** - Persistent connections supported
5. **Simpler Configuration** - No complex serverless setup

## Troubleshooting

### Build Failures
```bash
# Check build logs in Render dashboard
# Common fixes:
npm install --legacy-peer-deps
```

### Environment Variables
- Set all required environment variables in Render dashboard
- Use Render's built-in PostgreSQL for `DATABASE_URL`
- Generate secure random strings for secrets

### Static Site Routing
- The `render.yaml` already includes React Router configuration
- All routes redirect to `index.html` for client-side routing

## Cost Comparison

**Render Free Tier:**
- Web Service: 750 hours/month (enough for one app)
- Static Site: Unlimited
- PostgreSQL: 90 days free, then $7/month

**Much simpler than Vercel's serverless complexity!**
