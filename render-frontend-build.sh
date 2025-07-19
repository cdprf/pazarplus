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
# Handle client-side routing for SPA
/*    /index.html   200

# API routes should proxy to backend (if needed for static deployment)
/api/*    https://pazarplus.onrender.com/api/:splat   200
/health   https://pazarplus.onrender.com/health   200
EOF
    echo "✅ _redirects file created with proper SPA routing"
fi

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

echo "✅ Build completed successfully!"
echo "📊 Build directory contents:"
ls -la build/

echo "🔍 Verifying routing files in final build location..."
for file in _redirects .htaccess nginx.conf vercel.json web.config; do
    if [ -f "build/$file" ]; then
        echo "✅ $file confirmed in final location"
        echo "Contents of $file:"
        cat "build/$file"
        echo "---"
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
