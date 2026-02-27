const { query } = require('../config/db');

async function migrate() {
    console.log('🚀 Adding staff_id to orders table...');
    try {
        await query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES restaurant_staff(id) ON DELETE SET NULL;
        `);
        console.log('✅ Migration successful: staff_id added to orders table.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
