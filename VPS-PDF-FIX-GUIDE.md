# VPS PDF 404 Fix Guide

## Quick SSH Commands for VPS

Copy and run these commands on your VPS to fix the PDF 404 issue:

### 1. Connect to VPS and Navigate to Project
```bash
ssh root@yarukai.com
cd /var/www/html/pazar
```

### 2. Run Diagnostics
```bash
# Upload and run the diagnostic script
node vps-pdf-diagnostics.js
```

### 3. Check Current Directory Structure
```bash
# Check if PDF directory exists
ls -la server/public/shipping/
# If it doesn't exist, create it
mkdir -p server/public/shipping
chmod 755 server/public/shipping
```

### 4. Test Static File Serving
```bash
# Create a test file
echo "Test PDF serving" > server/public/shipping/test.txt

# Test if the file is accessible via HTTP
curl -I https://yarukai.com/shipping/test.txt
# Should return 200 OK
```

### 5. Check Environment Variables
```bash
# Check current environment
cat server/.env
# Make sure CLIENT_URL=https://yarukai.com
# Make sure SERVER_BASE_URL is either commented out or same as CLIENT_URL
```

### 6. Check Process Manager (PM2/Systemd)
```bash
# If using PM2
pm2 status
pm2 restart pazar-plus

# If using systemd
sudo systemctl status pazar-plus
sudo systemctl restart pazar-plus

# Check logs
pm2 logs pazar-plus --lines 50
# OR
sudo journalctl -u pazar-plus -f
```

### 7. Test PDF Generation
```bash
# Generate a test order to create a PDF
# Then check if files are being created:
ls -la server/public/shipping/
# Look for .pdf files with recent timestamps
```

### 8. Nginx Configuration (if using reverse proxy)
```bash
# Check nginx config
sudo nano /etc/nginx/sites-available/yarukai.com

# Make sure there's a location for static files:
# location /shipping/ {
#     alias /var/www/html/pazar/server/public/shipping/;
#     expires 1h;
#     add_header Cache-Control "public, must-revalidate, proxy-revalidate";
# }

# Restart nginx if changes made
sudo systemctl restart nginx
```

## Common Issues and Solutions

### Issue 1: Directory Permissions
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/html/pazar/server/public/
sudo chmod -R 755 /var/www/html/pazar/server/public/
```

### Issue 2: Environment Variables
```bash
# Check if .env file exists
cat server/.env

# If missing, create it:
cat > server/.env << 'EOF'
NODE_ENV=production
CLIENT_URL=https://yarukai.com
PORT=3000
EOF
```

### Issue 3: Node.js Process Not Running
```bash
# Check if Node.js is running
ps aux | grep node

# If not running, start it
cd /var/www/html/pazar/server
npm start
# OR with PM2
pm2 start ecosystem.config.js
```

### Issue 4: Wrong URL Generation
The issue might be in the URL generation logic. Check what URLs are being generated:

```bash
# Test URL generation
node -e "
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('SERVER_BASE_URL:', process.env.SERVER_BASE_URL);
const useAbsoluteUrl = process.env.SERVER_BASE_URL && process.env.SERVER_BASE_URL !== process.env.CLIENT_URL;
console.log('useAbsoluteUrl:', useAbsoluteUrl);
const testUrl = useAbsoluteUrl ? process.env.SERVER_BASE_URL + '/shipping/test.pdf' : '/shipping/test.pdf';
console.log('Generated URL:', testUrl);
"
```

## Expected Results

1. **Directory exists**: `/var/www/html/pazar/server/public/shipping/`
2. **Permissions correct**: `755` for directories, `644` for files
3. **Static serving works**: `curl https://yarukai.com/shipping/test.txt` returns 200
4. **Environment correct**: `CLIENT_URL=https://yarukai.com`, no `SERVER_BASE_URL` or same as CLIENT_URL
5. **Process running**: Node.js/PM2 process active
6. **URLs generated correctly**: `/shipping/filename.pdf` (relative URLs)

## Test Final Solution

```bash
# 1. Generate a shipping slip in the app
# 2. Check if PDF file was created
ls -la server/public/shipping/ | tail -5

# 3. Test the URL in browser
# https://yarukai.com/shipping/shipping_slip_XXXXX.pdf

# 4. If still 404, check server logs
pm2 logs pazar-plus --lines 20
```

## Emergency Workaround

If nothing else works, you can temporarily serve PDFs directly through the API:

```javascript
// Add this route to your server/routes/orders.js
app.get('/api/shipping/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../public/shipping', filename);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } else {
    res.status(404).send('PDF not found');
  }
});
```

Then update the PDF generator to use `/api/shipping/` instead of `/shipping/`.
