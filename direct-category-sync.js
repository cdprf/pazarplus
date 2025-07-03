#!/usr/bin/env node
/**
 * Direct category sync using public APIs (no auth required)
 */

const axios = require('axios');
const { PlatformCategory } = require('./server/models');

// API endpoints for public category data
const CATEGORY_APIS = {
  hepsiburada: 'https://listing-external-prod.hepsiburada.com/categories/leaf',
  n11: 'https://www.n11.com/cdn/api/category/all'
};

async function syncHepsiburadaCategories(userId) {
  console.log('🔄 Syncing Hepsiburada categories...');
  
  try {
    const response = await axios.get(CATEGORY_APIS.hepsiburada, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CategorySync/1.0)'
      }
    });
    
    const categories = response.data;
    console.log(`📥 Fetched ${categories.length} Hepsiburada categories`);
    
    if (categories.length === 0) {
      console.log('⚠️  No categories returned from Hepsiburada API');
      return 0;
    }
    
    // Transform and save categories
    let savedCount = 0;
    for (const cat of categories) {
      try {
        await PlatformCategory.findOrCreate({
          where: {
            platformType: 'hepsiburada',
            platformCategoryId: cat.categoryId.toString()
          },
          defaults: {
            platformType: 'hepsiburada',
            platformCategoryId: cat.categoryId.toString(),
            name: cat.categoryName || cat.name || 'Unknown',
            parentId: cat.parentCategoryId ? cat.parentCategoryId.toString() : null,
            path: cat.categoryPath || cat.name,
            level: parseInt(cat.level || 0),
            isLeaf: cat.leaf === true || cat.isLeaf === true,
            isActive: true,
            fieldDefinitions: {},
            requiredFields: [],
            restrictions: {},
            metadata: { source: 'hepsiburada_api', originalData: cat },
            lastSyncAt: new Date(),
            syncStatus: 'completed',
            userId: userId
          }
        });
        savedCount++;
      } catch (error) {
        console.error(`Failed to save category ${cat.categoryId}:`, error.message);
      }
    }
    
    console.log(`✅ Saved ${savedCount} Hepsiburada categories`);
    return savedCount;
    
  } catch (error) {
    console.error('❌ Hepsiburada sync failed:', error.message);
    return 0;
  }
}

async function syncN11Categories(userId) {
  console.log('🔄 Syncing N11 categories...');
  
  try {
    const response = await axios.get(CATEGORY_APIS.n11, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CategorySync/1.0)'
      }
    });
    
    const data = response.data;
    
    if (!data.categories || !Array.isArray(data.categories)) {
      console.log('⚠️  Invalid category data from N11 API');
      return 0;
    }
    
    const categories = data.categories;
    console.log(`📥 Fetched ${categories.length} N11 categories`);
    
    if (categories.length === 0) {
      return 0;
    }
    
    // Transform and save categories
    let savedCount = 0;
    for (const cat of categories) {
      try {
        await PlatformCategory.findOrCreate({
          where: {
            platformType: 'n11',
            platformCategoryId: cat.id.toString()
          },
          defaults: {
            platformType: 'n11',
            platformCategoryId: cat.id.toString(),
            name: cat.name || 'Unknown',
            parentId: cat.parentId ? cat.parentId.toString() : null,
            path: cat.fullName || cat.name,
            level: parseInt(cat.level || 0),
            isLeaf: cat.subCategories ? cat.subCategories.length === 0 : true,
            isActive: true,
            fieldDefinitions: {},
            requiredFields: [],
            restrictions: {},
            metadata: { source: 'n11_api', originalData: cat },
            lastSyncAt: new Date(),
            syncStatus: 'completed',
            userId: userId
          }
        });
        savedCount++;
      } catch (error) {
        console.error(`Failed to save category ${cat.id}:`, error.message);
      }
    }
    
    console.log(`✅ Saved ${savedCount} N11 categories`);
    return savedCount;
    
  } catch (error) {
    console.error('❌ N11 sync failed:', error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting direct category sync...');
  
  const { User } = require('./server/models');
  const user = await User.findOne();
  
  if (!user) {
    console.log('❌ No user found in database');
    return;
  }
  
  console.log(`Using user: ${user.email} (${user.id})`);
  
  // Check current counts
  console.log('\\n📊 Current category counts:');
  const trendyolCount = await PlatformCategory.count({ where: { platformType: 'trendyol' } });
  const hepsiburadaCount = await PlatformCategory.count({ where: { platformType: 'hepsiburada' } });
  const n11Count = await PlatformCategory.count({ where: { platformType: 'n11' } });
  
  console.log(`  Trendyol: ${trendyolCount}`);
  console.log(`  Hepsiburada: ${hepsiburadaCount}`);
  console.log(`  N11: ${n11Count}`);
  
  // Sync missing platforms
  if (hepsiburadaCount === 0) {
    const hepsiSaved = await syncHepsiburadaCategories(user.id);
    console.log(`\\n✅ Hepsiburada: ${hepsiSaved} categories synced`);
  } else {
    console.log('\\n✅ Hepsiburada already has categories');
  }
  
  if (n11Count === 0) {
    const n11Saved = await syncN11Categories(user.id);
    console.log(`\\n✅ N11: ${n11Saved} categories synced`);
  } else {
    console.log('\\n✅ N11 already has categories');
  }
  
  // Final counts
  console.log('\\n📊 Final category counts:');
  const finalTrendyol = await PlatformCategory.count({ where: { platformType: 'trendyol' } });
  const finalHepsi = await PlatformCategory.count({ where: { platformType: 'hepsiburada' } });
  const finalN11 = await PlatformCategory.count({ where: { platformType: 'n11' } });
  
  console.log(`  Trendyol: ${finalTrendyol}`);
  console.log(`  Hepsiburada: ${finalHepsi}`);
  console.log(`  N11: ${finalN11}`);
  
  console.log('\\n🎉 Category sync completed!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Sync failed:', error.message);
  process.exit(1);
});
