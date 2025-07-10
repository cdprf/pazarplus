const logger = require('../../utils/logger');

/**
 * Calculate platform price differences
 */
function calculatePlatformPriceDifferences(pricingData) {
  const platformPrices = new Map();

  pricingData.forEach((item) => {
    const platform = item.order?.platform || 'Unknown';
    const price = parseFloat(item.get('avgPrice') || 0);

    if (!platformPrices.has(platform)) {
      platformPrices.set(platform, []);
    }
    platformPrices.get(platform).push(price);
  });

  const differences = [];
  const platforms = Array.from(platformPrices.keys());

  for (let i = 0; i < platforms.length; i++) {
    for (let j = i + 1; j < platforms.length; j++) {
      const platform1 = platforms[i];
      const platform2 = platforms[j];

      const avg1 =
        platformPrices.get(platform1).reduce((sum, p) => sum + p, 0) /
        platformPrices.get(platform1).length;
      const avg2 =
        platformPrices.get(platform2).reduce((sum, p) => sum + p, 0) /
        platformPrices.get(platform2).length;

      const difference = avg1 > 0 ? (Math.abs(avg1 - avg2) / avg1) * 100 : 0;

      differences.push({
        platform1,
        platform2,
        avgPrice1: avg1.toFixed(2),
        avgPrice2: avg2.toFixed(2),
        difference: difference.toFixed(2)
      });
    }
  }

  return differences.sort(
    (a, b) => parseFloat(b.difference) - parseFloat(a.difference)
  );
}

/**
 * Analyze platform pricing patterns
 */
function analyzePlatformPricing(pricingData) {
  try {
    const platformBreakdown = {};

    pricingData.forEach((item) => {
      const platform = item.order?.platform || 'unknown';
      const price = parseFloat(item.price) || 0;
      const productId = item.productId;

      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = {
          platform,
          products: {},
          averagePrice: 0,
          totalSales: 0,
          count: 0
        };
      }

      if (!platformBreakdown[platform].products[productId]) {
        platformBreakdown[platform].products[productId] = {
          prices: [],
          avgPrice: 0,
          totalSold: 0
        };
      }

      platformBreakdown[platform].products[productId].prices.push(price);
      platformBreakdown[platform].products[productId].totalSold +=
        parseInt(item.totalSold) || 0;
      platformBreakdown[platform].totalSales += price;
      platformBreakdown[platform].count += 1;
    });

    // Calculate averages
    Object.values(platformBreakdown).forEach((platform) => {
      platform.averagePrice =
        platform.count > 0 ? platform.totalSales / platform.count : 0;

      Object.values(platform.products).forEach((product) => {
        product.avgPrice =
          product.prices.length > 0
            ? product.prices.reduce((sum, p) => sum + p, 0) /
              product.prices.length
            : 0;
      });
    });

    return Object.values(platformBreakdown);
  } catch (error) {
    logger.error('Error analyzing platform pricing:', error);
    return [];
  }
}

module.exports = {
  calculatePlatformPriceDifferences,
  analyzePlatformPricing
};
