const { PlatformConnection } = require('./server/models');
const TrendyolService = require('./server/modules/order-management/services/platforms/trendyol/trendyol-service');
const HepsiburadaService = require('./server/modules/order-management/services/platforms/hepsiburada/hepsiburada-service');
const N11Service = require('./server/modules/order-management/services/platforms/n11/n11-service');
const CategorySyncService = require('./server/services/CategorySyncService');

async function comprehensiveCategorySyncDiagnosis() {
    console.log('🔍 COMPREHENSIVE CATEGORY SYNC DIAGNOSIS');
    console.log('==========================================\n');

    try {
        // 1. Get connections
        const connections = await PlatformConnection.findAll({
            where: { isActive: true },
            include: ['user']
        });

        if (connections.length === 0) {
            console.log('❌ No active platform connections found');
            return;
        }

        console.log(`📡 Found ${connections.length} active connections:`);
        connections.forEach(conn => {
            console.log(`   - ${conn.platformType}: Connection ID ${conn.id} (User: ${conn.userId})`);
        });
        console.log();

        // 2. Test each platform service directly
        console.log('🔧 TESTING PLATFORM SERVICES DIRECTLY:');
        console.log('=====================================\n');

        for (const connection of connections) {
            console.log(`\n📊 Testing ${connection.platformType.toUpperCase()} Service:`);
            console.log('='.repeat(50));

            let service;
            try {
                // Create service instance
                switch (connection.platformType) {
                    case 'trendyol':
                        service = new TrendyolService(connection.id);
                        break;
                    case 'hepsiburada':
                        service = new HepsiburadaService(connection.id);
                        break;
                    case 'n11':
                        service = new N11Service(connection.id);
                        break;
                    default:
                        console.log(`   ❌ Unknown platform type: ${connection.platformType}`);
                        continue;
                }

                // Initialize service
                console.log('   🔌 Initializing service...');
                await service.initialize();
                console.log('   ✅ Service initialized successfully');

                // Test category fetching
                console.log('   📋 Calling getCategories()...');
                const categories = await service.getCategories();
                
                console.log('   📊 Raw getCategories() Response:');
                console.log(`     - Type: ${typeof categories}`);
                console.log(`     - Is Array: ${Array.isArray(categories)}`);
                console.log(`     - Length: ${categories ? categories.length : 'N/A'}`);
                
                if (categories && categories.length > 0) {
                    console.log('     - Sample Category:');
                    const sample = categories[0];
                    console.log(`       ID: ${sample.id || sample.categoryId || 'MISSING'}`);
                    console.log(`       Name: ${sample.name || sample.categoryName || 'MISSING'}`);
                    console.log(`       Parent ID: ${sample.parentId || sample.parentCategoryId || 'null'}`);
                    console.log(`       Full sample:`, JSON.stringify(sample, null, 2));
                } else {
                    console.log('     - No categories returned');
                }

            } catch (error) {
                console.log(`   ❌ Service test failed: ${error.message}`);
                console.log(`      Stack: ${error.stack}`);
            }
        }

        // 3. Test CategorySyncService
        console.log('\n\n🔄 TESTING CATEGORYSYNCSERVICE:');
        console.log('==============================\n');

        const syncService = new CategorySyncService();

        for (const connection of connections) {
            console.log(`\n📊 Testing sync for ${connection.platformType.toUpperCase()}:`);
            console.log('='.repeat(50));

            try {
                console.log(`   🔄 Calling syncPlatformCategories...`);
                const result = await syncService.syncPlatformCategories(
                    connection.platformType,
                    connection.userId,
                    connection.id,
                    true // Force refresh
                );

                console.log('   📊 Sync Result:');
                console.log(`     - Success: ${result.success}`);
                console.log(`     - Message: ${result.message}`);
                console.log(`     - Categories Count: ${result.categoriesCount || 'N/A'}`);
                
                if (result.categories && result.categories.length > 0) {
                    console.log('     - Sample Synced Category:');
                    const sample = result.categories[0];
                    console.log(`       Platform Type: ${sample.platformType || 'MISSING'}`);
                    console.log(`       Platform Category ID: ${sample.platformCategoryId || 'MISSING'}`);
                    console.log(`       Name: ${sample.name || 'MISSING'}`);
                    console.log(`       User ID: ${sample.userId || 'MISSING'}`);
                }

            } catch (error) {
                console.log(`   ❌ Sync failed: ${error.message}`);
                console.log(`      Error details:`, error);
                
                // If it's a database constraint error, let's check what data we're trying to insert
                if (error.message.includes('userId') && error.message.includes('not-null constraint')) {
                    console.log('\n   🔍 ANALYZING userId CONSTRAINT ERROR:');
                    console.log('   =====================================');
                    
                    try {
                        // Test the transform method directly
                        const platformService = await syncService.getPlatformService(
                            connection.platformType,
                            connection.userId,
                            connection.id
                        );
                        
                        const categories = await platformService.getCategories();
                        if (categories && categories.length > 0) {
                            const sampleCategory = categories[0];
                            console.log('   📊 Sample platform category data:');
                            console.log(JSON.stringify(sampleCategory, null, 2));
                            
                            console.log('\n   🔄 Testing transform method:');
                            const transformed = syncService.transformPlatformCategory(
                                connection.platformType,
                                sampleCategory,
                                connection.userId
                            );
                            console.log('   📊 Transformed category data:');
                            console.log(JSON.stringify(transformed, null, 2));
                            
                            // Check if userId is missing
                            if (!transformed.userId) {
                                console.log('   ❌ PROBLEM FOUND: userId is missing from transformed data!');
                            } else {
                                console.log('   ✅ userId is present in transformed data');
                            }
                        }
                    } catch (transformError) {
                        console.log(`   ❌ Transform test failed: ${transformError.message}`);
                    }
                }
            }
        }

        console.log('\n\n✅ COMPREHENSIVE DIAGNOSIS COMPLETE');
        console.log('=====================================');

    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
    } finally {
        process.exit(0);
    }
}

// Run the comprehensive diagnosis
comprehensiveCategorySyncDiagnosis();
