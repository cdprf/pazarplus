# Vercel Deployment Guide for Pazar+ Demo

## 🚀 Quick Deployment Steps

### 1. Prerequisites

- Vercel account (free tier is sufficient for demo)
- PostgreSQL database (we recommend [Neon](https://neon.tech) or [Supabase](https://supabase.com) for free PostgreSQL)
- GitHub repository with your code

### 2. Database Setup

**Option A: Using Neon (Recommended)**
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project/database
3. Copy the connection string (it should look like: `postgresql://username:password@hostname/database`)

**Option B: Using Supabase**
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings > Database and copy the connection URI

### 3. Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Deploy from GitHub**
   - Push your code to GitHub
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   
   In Vercel dashboard, go to your project > Settings > Environment Variables and add:

   ```env
   # Database Configuration
   DB_TYPE=postgres
   DB_HOST=your-postgres-host.neon.tech
   DB_NAME=your-database-name
   DB_USER=your-username
   DB_PASSWORD=your-password
   DB_PORT=5432
   
   # JWT Configuration (Generate a secure random string)
   JWT_SECRET=your-super-secure-jwt-secret-change-this
   JWT_EXPIRES_IN=7d
   
   # API Configuration
   NODE_ENV=production
   API_VERSION=v1
   
   # Platform API Keys (Optional - for full functionality)
   HEPSIBURADA_USERNAME=your-hepsiburada-username
   HEPSIBURADA_PASSWORD=your-hepsiburada-password
   TRENDYOL_API_KEY=your-trendyol-api-key
   TRENDYOL_API_SECRET=your-trendyol-api-secret
   N11_API_KEY=your-n11-api-key
   N11_API_SECRET=your-n11-api-secret
   
   # CORS Configuration
   CORS_ORIGIN=https://your-vercel-app-url.vercel.app
   ```

### 4. Build Configuration

The project is already configured with:
- `vercel.json` - Vercel deployment configuration
- API routes properly configured
- Build scripts optimized for Vercel

### 5. Deploy

1. **Manual Deploy**
   ```bash
   vercel --prod
   ```

2. **Auto Deploy via GitHub**
   - Any push to main branch will automatically deploy
   - Pull requests create preview deployments

### 6. Post-Deployment Setup

After successful deployment, your app will need database initialization:

1. **Access your deployed app** at `https://your-project.vercel.app`
2. **Database tables will be created automatically** on first API call
3. **Create an admin user** via the registration page

### 7. Demo Features Available

✅ **Available without API keys:**
- User authentication and management
- Product management interface
- Order management dashboard
- Analytics dashboard
- Customer questions interface
- Variant management
- Stock filtering and search

✅ **Requires API keys for full functionality:**
- Real marketplace data sync (Hepsiburada, Trendyol, N11)
- Live order fetching
- Platform-specific features

## 🎯 Demo Usage Guide

### For Testing/Demo Purposes:

1. **Create Test Data**
   - Register as a new user
   - Use the "Create Test Data" buttons in the interface
   - Add sample products and orders

2. **Key Features to Demonstrate**
   - 📊 **Analytics Dashboard** - View charts and KPIs
   - 📦 **Product Management** - Add, edit, manage products
   - 🛍️ **Order Management** - Track order status and details
   - ❓ **Customer Questions** - Manage customer inquiries
   - 🔄 **Variant Management** - Handle product variants
   - 📈 **Stock Filtering** - Filter products by stock levels

3. **Admin Features**
   - User management
   - System settings
   - Platform configurations

## 🛠️ Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Verify PostgreSQL connection string in environment variables
   - Ensure database is accessible from Vercel (check firewall settings)

2. **Build Errors**
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are listed in package.json

3. **API Routes Not Working**
   - Verify `api/index.js` exists and exports the app
   - Check function timeout settings in vercel.json

4. **Frontend Not Loading**
   - Ensure client build completed successfully
   - Check static file routing in vercel.json

### Performance Optimization:

1. **Database Optimization**
   - Use connection pooling for PostgreSQL
   - Enable query optimization
   - Add proper indexes (already included)

2. **Caching** (Optional)
   - Add Redis caching with Upstash for better performance
   - Enable Vercel Edge Caching

## 📱 Mobile Responsiveness

The application is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile devices
- Different screen orientations

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention

## 📊 Monitoring

Monitor your deployment:
- Vercel Analytics (built-in)
- Function logs in Vercel dashboard
- Performance metrics
- Error tracking

---

## 🚀 Quick Start Commands

```bash
# Clone your repository
git clone your-repo-url
cd pazar-plus

# Install dependencies
npm run install:all

# Build client
cd client && npm run build

# Deploy to Vercel
npx vercel --prod
```

Your Pazar+ demo will be live at `https://your-project.vercel.app`! 🎉
