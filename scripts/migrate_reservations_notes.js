const { query } = require('../config/db');

async function migrate() {
    console.log('🚀 Adding "notes" column to "reservations" table...');
    try {
        await query(`
            ALTER TABLE reservations 
            ADD COLUMN IF NOT EXISTS notes TEXT
        `);
        console.log('✅ Column "notes" added successfully.');
    } catch (error) {
        console.error('❌ Error adding "notes" column:', error.message);
    } finally {
        process.exit(0);
    }
}

migrate();
