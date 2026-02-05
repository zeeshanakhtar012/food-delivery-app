const fs = require('fs');
const path = require('path');
const { query, pool } = require('../config/db');

async function setupDatabase() {
    try {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        if (!fs.existsSync(schemaPath)) {
            console.error('❌ Schema file not found at:', schemaPath);
            return;
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('🔧 Running schema.sql to create missing tables...');
        await query(schemaSql);
        console.log('✅ Schema applied successfully. "admins" table should now exist.');
    } catch (err) {
        console.error('❌ Error applying schema:', err);
    } finally {
        await pool.end();
    }
}

setupDatabase();
