const { pool } = require('../config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting orders schema migration...');
        await client.query('BEGIN');

        // Add missing columns to orders table
        console.log('🛠️ Adding customer_name and customer_phone to orders table...');
        await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
    `);
        console.log('✅ Orders table updated.');

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
