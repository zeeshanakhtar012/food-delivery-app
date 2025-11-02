/**
 * Script to create food_categories table if it doesn't exist
 */

const { query } = require('../config/db');

async function createFoodCategoriesTable() {
  try {
    console.log('🔧 Creating food_categories table...\n');

    // Create food_categories table
    await query(`
      CREATE TABLE IF NOT EXISTS food_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add category_id column to foods table if it doesn't exist
    await query(`
      ALTER TABLE foods 
      ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES food_categories(id) ON DELETE SET NULL
    `);

    // Create index for better query performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_food_categories_restaurant_id ON food_categories(restaurant_id)
    `);

    console.log('✅ food_categories table created successfully!\n');
    console.log('✅ Added category_id column to foods table!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating food_categories table:', error.message);
    process.exit(1);
  }
}

// Run the script
createFoodCategoriesTable();

