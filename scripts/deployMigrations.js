const { exec } = require('child_process');
const path = require('path');

const scripts = [
    'setupDatabase.js',
    'createFoodCategoriesTable.js',
    'migrateFoodAddonsTable.js',
    'migrateRestaurantStaffTable.js',
    'migrateCouponsAndBanners.js',
    'createAuditLogsTable.js'
];

async function runMigrations() {
    console.log('🚀 Starting deployment migrations...');

    for (const script of scripts) {
        const scriptPath = path.join(__dirname, script);
        console.log(`\n⏳ Running ${script}...`);

        try {
            await new Promise((resolve, reject) => {
                exec(`node ${scriptPath}`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ Error running ${script}:`, error);
                        console.error(stderr);
                        reject(error);
                        return;
                    }
                    console.log(stdout);
                    if (stderr) console.error(stderr);
                    resolve();
                });
            });
            console.log(`✅ ${script} completed.`);
        } catch (err) {
            console.error(`❌ Migration failed at ${script}. Stopping.`);
            process.exit(1);
        }
    }

    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
}

runMigrations();
