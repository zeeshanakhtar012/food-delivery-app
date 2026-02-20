require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
    try {
        console.log('--- ADDING order_type COLUMN ---');

        // Check if column exists
        const check = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='orders' AND column_name='order_type'
    `);

        if (check.rows.length === 0) {
            await pool.query(`
            ALTER TABLE orders 
            ADD COLUMN order_type VARCHAR(50) DEFAULT 'dine_in';
        `);
            console.log('✅ Added order_type column successfully.');
        } else {
            console.log('⚠️ Column order_type already exists.');
        }

    } catch (err) {
        console.error('Migration Error:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
