/**
 * Migration script to create coupons and banners tables
 * Run this if you get errors about missing coupons or banners tables
 */

require('dotenv').config();
const { query } = require('../config/db');

async function migrateCouponsAndBanners() {
  try {
    console.log('🔄 Starting coupons and banners tables migration...\n');

    // Check if coupons table exists
    const checkCoupons = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'coupons'
      )
    `);

    if (!checkCoupons.rows[0].exists) {
      console.log('➕ Creating coupons table...');
      
      // First check if coupon_type enum exists
      const checkEnum = await query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'coupon_type'
        )
      `);

      if (!checkEnum.rows[0].exists) {
        console.log('➕ Creating coupon_type enum...');
        await query(`CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount', 'free_delivery')`);
      }

      // Create coupons table
      await query(`
        CREATE TABLE IF NOT EXISTS coupons (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
          code VARCHAR(50) NOT NULL UNIQUE,
          type coupon_type NOT NULL,
          value DECIMAL(10, 2) NOT NULL,
          min_order_amount DECIMAL(10, 2) DEFAULT 0,
          max_discount_amount DECIMAL(10, 2),
          usage_limit INTEGER,
          used_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          valid_from TIMESTAMP NOT NULL,
          valid_until TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index
      await query(`
        CREATE INDEX IF NOT EXISTS idx_coupons_restaurant_id ON coupons(restaurant_id)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)
      `);

      console.log('✅ Created coupons table\n');
    } else {
      console.log('ℹ️  coupons table already exists\n');
    }

    // Check if banners table exists
    const checkBanners = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'banners'
      )
    `);

    if (!checkBanners.rows[0].exists) {
      console.log('➕ Creating banners table...');
      
      // Create banners table
      await query(`
        CREATE TABLE IF NOT EXISTS banners (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255),
          description TEXT,
          image_url TEXT NOT NULL,
          link_url TEXT,
          restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
          is_active BOOLEAN DEFAULT TRUE,
          display_order INTEGER DEFAULT 0,
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index
      await query(`
        CREATE INDEX IF NOT EXISTS idx_banners_restaurant_id ON banners(restaurant_id)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active)
      `);

      console.log('✅ Created banners table\n');
    } else {
      console.log('ℹ️  banners table already exists\n');
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
migrateCouponsAndBanners();

