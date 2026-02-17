/**
 * Script to make user_id nullable in orders table (for POS support)
 */

const { query } = require('../config/db');

async function makeUserIdNullable() {
    try {
        console.log('🔧 Updating orders table schema...');

        await query(`
      ALTER TABLE orders 
      ALTER COLUMN user_id DROP NOT NULL;
    `);

        // Also remove unique constraint on riders email if it causes issues (optional, but good for testing)
        // await query(`ALTER TABLE riders DROP CONSTRAINT IF EXISTS riders_email_restaurant_id_key`);

        console.log('✅ orders table updated: user_id is now nullable.\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating orders table:', error.message);
        process.exit(1);
    }
}

makeUserIdNullable();
