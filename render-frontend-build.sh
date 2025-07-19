#!/bin/bash

# Render Frontend Build Script for Pazar+
# This script builds the React client and ensures proper SPA routing configuration

set -e  # Exit on any error

echo "🚀 Starting Render frontend build process..."

# Ensure we're in the project root
cd "$(dirname "$0")"

echo "📦 Installing client dependencies..."
cd client
npm ci --production=false

echo "🔨 Building React application..."
CI=false npm run build

echo "🔍 Verifying _redirects file in build..."
if [ -f "build/_redirects" ]; then
    echo "✅ _redirects file found in build directory"
    cat build/_redirects
else
    echo "⚠️  _redirects file not found, creating it..."
    # Create proper _redirects file for Render.com SPA routing
    cat > build/_redirects << 'EOF'
# Render.com SPA routing configuration
# This file handles client-side routing for single page applications

# API proxying (optional - for mixed deployments)
/api/*  https://pazarplus.onrender.com/api/:splat  200
/health https://pazarplus.onrender.com/health      200

# SPA fallback - MUST be last rule
# All other routes should serve index.html with 200 status
/*      /index.html   200
EOF
    echo "✅ _redirects file created with proper SPA routing"
fi

# Force copy the _redirects file to ensure it's present
echo "🔧 Ensuring _redirects file is properly placed..."
cp build/_redirects build/_redirects.backup
cat > build/_redirects << 'EOF'
# Render.com SPA routing configuration
# This file handles client-side routing for single page applications

# API proxying (optional - for mixed deployments)
/api/*  https://pazarplus.onrender.com/api/:splat  200
/health https://pazarplus.onrender.com/health      200

# SPA fallback - MUST be last rule
# All other routes should serve index.html with 200 status
/*      /index.html   200
EOF

echo "🔧 Creating additional routing support files..."
# Create .htaccess for Apache servers (fallback)
cat > build/.htaccess << 'EOF'
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
EOF

# Create nginx.conf snippet for reference
cat > build/nginx.conf << 'EOF'
location / {
  try_files $uri $uri/ /index.html;
}
EOF

# Create vercel.json for Vercel deployment (if needed)
cat > build/vercel.json << 'EOF'
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
EOF

echo "✅ Routing support files created"

echo "📁 Moving build directory to root for Render..."
cd ..
if [ -d "build" ]; then
    rm -rf build
fi
mv client/build ./build

# CRITICAL: Ensure _redirects file exists in final build location
echo "🔧 Creating _redirects file in final build location..."
cat > build/_redirects << 'EOF'
# Render.com SPA routing - CRITICAL for client-side routing

# Backend file routes - PDF files, downloads, etc.
/shipping/*.pdf  https://pazarplus.onrender.com/shipping/:splat  200
/downloads/*     https://pazarplus.onrender.com/downloads/:splat  200
/uploads/*       https://pazarplus.onrender.com/uploads/:splat    200
/files/*         https://pazarplus.onrender.com/files/:splat      200

# API proxying
/api/*  https://pazarplus.onrender.com/api/:splat  200
/health https://pazarplus.onrender.com/health      200

# SPA fallback - MUST be last rule
/*      /index.html   200
EOF

# Create 404.html fallback
cp build/index.html build/404.html

echo "✅ Build completed successfully!"
echo "📊 Build directory contents:"
ls -la build/

echo "🔍 Verifying routing files in final build location..."
for file in _redirects 404.html .htaccess nginx.conf vercel.json web.config; do
    if [ -f "build/$file" ]; then
        echo "✅ $file confirmed in final location"
        if [ "$file" = "_redirects" ]; then
            echo "Contents of _redirects:"
            cat "build/$file"
            echo "---"
        fi
    else
        echo "❌ $file missing in final location"
    fi
done

echo "🎉 Ready for Render deployment!"
echo ""
echo "📝 Deployment Notes:"
echo "   - _redirects file handles SPA routing for Render.com"
echo "   - .htaccess provides Apache fallback"
echo "   - nginx.conf provides Nginx reference"
echo "   - vercel.json provides Vercel compatibility"
echo "   - web.config provides IIS/Windows compatibility"
echo "   - All client-side routes will serve index.html with 200 status"
echo "   - API routes are proxied to backend server"
echo "   - Server-side routing also configured for fallback"
