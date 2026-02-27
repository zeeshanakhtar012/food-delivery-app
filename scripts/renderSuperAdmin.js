/**
 * renderSuperAdmin.js
 * Unattended super admin provisioning for Render database
 * Usage: DATABASE_URL="postgresql://..." node scripts/renderSuperAdmin.js
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌  Set DATABASE_URL env var first');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Admin123!', salt);

        const res = await client.query(
            `INSERT INTO admins (name, email, password, role) 
             VALUES ($1, $2, $3, $4) RETURNING id, email`,
            ['Super Admin', 'admin@fooddelivery.com', passwordHash, 'super_admin']
        );

        console.log('✅  Super Admin created successfully!');
        console.log(`Email: ${res.rows[0].email}`);
        console.log('Password: Admin123!');

    } catch (err) {
        if (err.code === '23505') {
            console.log('⚠️  Super admin already exists.');
        } else {
            console.error('❌  Fatal error:', err);
        }
    } finally {
        await client.end();
    }
}

createAdmin();
