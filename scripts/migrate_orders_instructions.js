const { pool } = require('../config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting orders schema migration (instructions)...');
        await client.query('BEGIN');

        // Add missing columns to orders table
        console.log('🛠️ Adding delivery_instructions to orders table...');
        await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
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
