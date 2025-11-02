/**
 * Migration script to create restaurant_staff table
 * Run this if you get errors about missing restaurant_staff table
 */

require('dotenv').config();
const { query } = require('../config/db');

async function migrateRestaurantStaffTable() {
  try {
    console.log('🔄 Starting restaurant_staff table migration...\n');

    // Check if restaurant_staff table exists
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'restaurant_staff'
      )
    `);

    if (checkTable.rows[0].exists) {
      console.log('ℹ️  restaurant_staff table already exists\n');
      process.exit(0);
    }

    console.log('➕ Creating restaurant_staff table...');
    
    // Create restaurant_staff table
    await query(`
      CREATE TABLE IF NOT EXISTS restaurant_staff (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, email)
      )
    `);

    console.log('✅ Created restaurant_staff table\n');

    // Create index for better performance
    console.log('➕ Creating indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_restaurant_staff_restaurant_id ON restaurant_staff(restaurant_id)
    `);
    console.log('✅ Created indexes\n');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateRestaurantStaffTable();

