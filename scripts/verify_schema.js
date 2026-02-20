const { pool } = require('../config/db');

async function verify() {
    try {
        console.log('🔍 Verifying schema...');

        // Check foods columns
        const foodsCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'foods' AND column_name IN ('is_unlimited', 'stock_quantity');
    `);
        console.log('Foods columns found:', foodsCols.rows.map(r => r.column_name));

        // Check reservations table
        const reservationsTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'reservations';
    `);
        console.log('Reservations table found:', reservationsTable.rows.length > 0);

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        pool.end();
    }
}

verify();
