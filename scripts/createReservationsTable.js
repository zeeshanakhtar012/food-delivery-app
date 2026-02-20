/**
 * Script to create reservations table
 */

const { query } = require('../config/db');

async function createReservationsTable() {
    try {
        console.log('🔧 Creating reservations table...');

        await query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL,
        user_id UUID, -- Nullable for guest reservations
        table_id UUID, -- Nullable (can be assigned later)
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        reservation_time TIMESTAMP WITH TIME ZONE NOT NULL,
        guest_count INTEGER DEFAULT 2,
        status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (table_id) REFERENCES dining_tables(id) ON DELETE SET NULL
      );
    `);

        // Create indexes
        await query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_id ON reservations(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_reservation_time ON reservations(reservation_time);
    `);

        console.log('✅ reservations table created successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating reservations table:', error.message);
        process.exit(1);
    }
}

createReservationsTable();
