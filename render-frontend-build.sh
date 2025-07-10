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
    echo "/*    /index.html   200" > build/_redirects
    echo "✅ _redirects file created"
fi

echo "🔧 Creating additional routing support files..."
# Create .htaccess for Apache servers (fallback)
cat > build/.htaccess << 'EOF'
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
EOF

# Create nginx.conf snippet for reference
cat > build/nginx.conf << 'EOF'
try_files $uri $uri/ /index.html;
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
for file in _redirects .htaccess nginx.conf; do
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
echo "   - _redirects file handles SPA routing"
echo "   - .htaccess provides Apache fallback"
echo "   - nginx.conf provides Nginx reference"
echo "   - All routes will serve index.html with 200 status"
