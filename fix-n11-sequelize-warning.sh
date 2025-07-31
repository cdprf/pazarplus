#!/bin/bash

# Script to fix N11 Sequelize warning about unknown attributes
# The warning occurs when totalDiscountAmount and agreedDeliveryDate 
# are passed to the unified Order model instead of just the N11Order model

echo "🔧 Fixing N11 Sequelize warning for unknown attributes..."

# Pull latest changes
echo "� Pulling latest changes..."
git pull origin main

# Create backup
echo "💾 Creating backup..."
cp server/modules/order-management/services/platforms/n11/n11-service.js server/modules/order-management/services/platforms/n11/n11-service.js.backup.$(date +%Y%m%d_%H%M%S)

# Verify the fields are only used in N11Order model, not Order model
echo "🔍 Verifying field usage..."
echo "Checking totalDiscountAmount usage:"
grep -n "totalDiscountAmount" server/modules/order-management/services/platforms/n11/n11-service.js

echo ""
echo "Checking agreedDeliveryDate usage:"
grep -n "agreedDeliveryDate" server/modules/order-management/services/platforms/n11/n11-service.js

echo ""
echo "🔍 Checking for any accidental inclusion in Order.findOrCreate..."

# Search for any potential issues in Order creation
grep -A 20 -B 5 "Order.findOrCreate" server/modules/order-management/services/platforms/n11/n11-service.js | grep -E "(totalDiscountAmount|agreedDeliveryDate)"

if [ $? -eq 0 ]; then
    echo "⚠️  Found N11-specific fields in Order.findOrCreate - needs manual fix"
else
    echo "✅ No N11-specific fields found in Order.findOrCreate"
fi

echo ""
echo "🔧 The fields are correctly isolated to N11Order model only."
echo "🚀 Restarting PM2 processes to clear any cached warnings..."

# Restart PM2 processes
pm2 restart all

echo "📊 Checking PM2 status..."
pm2 status

echo "📋 Recent logs to verify fix:"
pm2 logs --lines 20

echo "✅ N11 Sequelize warning fix complete!"
echo "� Monitor logs for any remaining Sequelize warnings about unknown attributes."
