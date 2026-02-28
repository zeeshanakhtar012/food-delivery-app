const { query } = require('../config/db');

const migrateDefaultIsActive = async () => {
    console.log('Starting migration: Setting default is_active to FALSE for riders and staff...');

    try {
        // Change default for riders
        await query(`
            ALTER TABLE riders 
            ALTER COLUMN is_active SET DEFAULT FALSE;
        `);
        console.log('✅ Default is_active set to FALSE for riders.');

        // Change default for restaurant_staff
        await query(`
            ALTER TABLE restaurant_staff 
            ALTER COLUMN is_active SET DEFAULT FALSE;
        `);
        console.log('✅ Default is_active set to FALSE for restaurant_staff.');

        console.log('🚀 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrateDefaultIsActive();
