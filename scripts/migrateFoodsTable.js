/**
 * Migration script to add missing columns to foods table
 * Run this if you get errors about missing columns: preparation_time, category_id
 */

require('dotenv').config();
const { query } = require('../config/db');

async function migrateFoodsTable() {
  try {
    console.log('🔄 Starting foods table migration...\n');

    // Check if preparation_time column exists
    const checkPreparationTime = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='foods' AND column_name='preparation_time'
    `);

    if (checkPreparationTime.rows.length === 0) {
      console.log('➕ Adding preparation_time column...');
      await query(`
        ALTER TABLE foods 
        ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 15
      `);
      console.log('✅ Added preparation_time column\n');
    } else {
      console.log('ℹ️  preparation_time column already exists\n');
    }

    // Check if category_id column exists
    const checkCategoryId = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='foods' AND column_name='category_id'
    `);

    if (checkCategoryId.rows.length === 0) {
      console.log('➕ Adding category_id column...');
      
      // First check if food_categories table exists
      const checkCategoriesTable = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'food_categories'
        )
      `);

      if (checkCategoriesTable.rows[0].exists) {
        await query(`
          ALTER TABLE foods 
          ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES food_categories(id) ON DELETE SET NULL
        `);
        console.log('✅ Added category_id column with foreign key\n');
      } else {
        // Add column without foreign key if food_categories doesn't exist yet
        await query(`
          ALTER TABLE foods 
          ADD COLUMN IF NOT EXISTS category_id UUID
        `);
        console.log('✅ Added category_id column (without foreign key - food_categories table not found)\n');
      }
    } else {
      console.log('ℹ️  category_id column already exists\n');
    }

    // Check if other expanded schema columns exist and add them if missing
    const columnsToAdd = [
      { name: 'rating', type: 'DECIMAL(2,1) DEFAULT 0.0' },
      { name: 'total_reviews', type: 'INTEGER DEFAULT 0' },
      { name: 'stock_quantity', type: 'INTEGER DEFAULT NULL' },
      { name: 'is_featured', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'sort_order', type: 'INTEGER DEFAULT 0' }
    ];

    for (const column of columnsToAdd) {
      const checkColumn = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='foods' AND column_name='${column.name}'
      `);

      if (checkColumn.rows.length === 0) {
        console.log(`➕ Adding ${column.name} column...`);
        await query(`
          ALTER TABLE foods 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
        console.log(`✅ Added ${column.name} column\n`);
      }
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateFoodsTable();

