/**
 * Migration script to create food_addons table
 * Run this if you get errors about missing food_addons table
 */

require('dotenv').config();
const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function migrateFoodAddonsTable() {
  try {
    console.log('🔄 Starting food_addons table migration...\n');

    // Check if food_addons table exists
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'food_addons'
      )
    `);

    if (checkTable.rows[0].exists) {
      console.log('ℹ️  food_addons table already exists\n');
      process.exit(0);
    }

    console.log('➕ Creating food_addons table...');
    
    // Create food_addons table
    await query(`
      CREATE TABLE IF NOT EXISTS food_addons (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        is_required BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Created food_addons table\n');

    // Create index for better performance
    console.log('➕ Creating index on food_id...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_food_addons_food_id ON food_addons(food_id)
    `);
    console.log('✅ Created index\n');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateFoodAddonsTable();

