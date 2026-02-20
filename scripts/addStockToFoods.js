/**
 * Script to add stock tracking to foods table
 */

const { query } = require('../config/db');

async function addStockToFoods() {
    try {
        console.log('🔧 Adding stock tracking columns to foods table...');

        await query(`
      ALTER TABLE foods 
      ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT TRUE;
    `);

        console.log('✅ foods table updated: stock_quantity and is_unlimited columns added.\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating foods table:', error.message);
        process.exit(1);
    }
}

addStockToFoods();
