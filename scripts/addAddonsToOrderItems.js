/**
 * Script to add addons column to order_items table
 */

const { query } = require('../config/db');

async function addAddonsToOrderItems() {
    try {
        console.log('🔧 Adding addons column to order_items table...');

        await query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb;
    `);

        console.log('✅ order_items table updated: addons column added.\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating order_items table:', error.message);
        process.exit(1);
    }
}

addAddonsToOrderItems();
