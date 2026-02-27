const { exec } = require('child_process');
const path = require('path');

const migrations = [
    'setupDatabase.js',
    'createFoodCategoriesTable.js',
    'migrateFoodsTable.js',
    'migrateRestaurantStaffTable.js',
    'migrateFoodAddonsTable.js',
    'migrateRiderFeatures.js',
    'migrateCouponsAndBanners.js',
    'createAuditLogsTable.js',
    'createDiningTablesTable.js',
    'updateOrdersSchema.js',
    'addAddonsToOrderItems.js',
    'createReservationsTable.js',
    'addStockToFoods.js',
    'add_order_type.js',
    'migrate_orders_instructions.js',
    'migrate_orders_schema.js',
    'migrate_schema_fix.js',
    'migrate_session_token.js',
    'migrate_staff_id.js',
    'fix_enums.js'
];

async function runMigrations() {
    console.log('🚀 Starting deployment migrations...\n');

    for (const migration of migrations) {
        console.log(`⏳ Running ${migration}...`);
        try {
            await new Promise((resolve, reject) => {
                const child = exec(`node ${path.join(__dirname, migration)}`);

                child.stdout.on('data', (data) => {
                    console.log(data.toString());
                });

                child.stderr.on('data', (data) => {
                    console.error(data.toString());
                });

                child.on('exit', (code) => {
                    if (code === 0) {
                        console.log(`✅ ${migration} completed.\n`);
                        resolve();
                    } else {
                        reject(new Error(`Migration failed with code ${code}`));
                    }
                });
            });
        } catch (error) {
            console.error(`❌ Migration failed at ${migration}. Stopping.`);
            process.exit(1);
        }
    }

    console.log('🎉 All migrations completed successfully!');
}

runMigrations();
