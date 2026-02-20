const { pool } = require('../config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting schema migration...');
        await client.query('BEGIN');

        // 1. Fix Foods Table
        console.log('🛠️ Adding missing columns to foods table...');
        await client.query(`
      ALTER TABLE foods 
      ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
    `);
        console.log('✅ Foods table updated.');

        // 2. Create Reservations Table
        console.log('🛠️ Creating reservations table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        guest_count INTEGER NOT NULL DEFAULT 1,
        reservation_time TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        special_requests TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Add index if it doesn't exist (checking existence first to avoid error if re-run)
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_id ON reservations(restaurant_id);
    `);
        console.log('✅ Reservations table created.');

        await client.query('COMMIT');
        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
