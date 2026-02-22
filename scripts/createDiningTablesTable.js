/**
 * Script to create dining_tables table if it doesn't exist
 */

const { query } = require('../config/db');

async function createDiningTablesTable() {
    try {
        console.log('🔧 Creating dining_tables table...\n');

        // Create enum type if not exists
        await query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status') THEN
              CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');
          END IF;
      END$$;
    `);

        // Create dining_tables table
        await query(`
      CREATE TABLE IF NOT EXISTS dining_tables (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        table_number VARCHAR(50) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 4,
        status table_status DEFAULT 'available',
        section VARCHAR(100) DEFAULT 'Main Hall',
        qr_code TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, table_number)
      )
    `);

        // Create index
        await query(`
      CREATE INDEX IF NOT EXISTS idx_dining_tables_restaurant_id ON dining_tables(restaurant_id)
    `);

        // Add table_id and order_type to orders table if not exist
        await query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'table_id') THEN
              ALTER TABLE orders ADD COLUMN table_id UUID REFERENCES dining_tables(id) ON DELETE SET NULL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type') THEN
              ALTER TABLE orders ADD COLUMN order_type VARCHAR(50) DEFAULT 'delivery'; -- delivery, dine_in, takeaway
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
              ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN
              ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50);
          END IF;
      END$$;
    `);

        console.log('✅ dining_tables table and orders schema updated successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating dining_tables table:', error.message);
        process.exit(1);
    }
}

createDiningTablesTable();
