require('dotenv').config();
const { pool } = require('../config/db');

async function runDebug() {
    try {
        console.log('--- DEBUGGING DATABASE ---');

        // 1. Get Restaurants
        const resRest = await pool.query('SELECT id, name FROM restaurants');
        console.log(`\nRestaurants (${resRest.rows.length}):`);
        resRest.rows.forEach(r => console.log(` - [${r.id}] ${r.name}`));

        if (resRest.rows.length === 0) {
            console.log('NO RESTAURANTS FOUND.');
            process.exit();
        }

        const firstRestId = resRest.rows[0].id;

        // 2. Get Admins
        const resAdmin = await pool.query('SELECT id, email, role, restaurant_id FROM admins');
        console.log(`\nAdmins (${resAdmin.rows.length}):`);
        resAdmin.rows.forEach(a => console.log(` - [${a.id}] ${a.email} (Role: ${a.role}, RestID: ${a.restaurant_id})`));

        // 3. Get Orders
        const resOrders = await pool.query('SELECT id, restaurant_id, status, total_amount, created_at FROM orders');
        console.log(`\nOrders (${resOrders.rows.length}):`);
        resOrders.rows.forEach(o => console.log(` - [${o.id}] RestID: ${o.restaurant_id}, Status: ${o.status}, Amount: ${o.total_amount}`));

        // 4. Counts per restaurant
        const resCounts = await pool.query('SELECT restaurant_id, COUNT(*) FROM orders GROUP BY restaurant_id');
        console.log(`\nOrder Counts per Restaurant:`);
        resCounts.rows.forEach(c => console.log(` - RestID: ${c.restaurant_id}: ${c.count} orders`));

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        console.log('--- END DEBUG ---');
        // Force exit to ensure script terminates
        process.exit(0);
    }
}

// Add a timeout to prevent hanging
setTimeout(() => {
    console.error('Script timed out!');
    process.exit(1);
}, 5000);

runDebug();
