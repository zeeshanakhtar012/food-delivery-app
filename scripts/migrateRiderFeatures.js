const { fs } = require('fs');
const path = require('path');
const { query } = require('../config/db');

async function migrate() {
    console.log('🚀 Running Rider Status and Wallet migration...');
    try {
        const migrationPath = path.join(__dirname, '../database/migrations/003_add_rider_wallet_and_status.sql');
        const sql = require('fs').readFileSync(migrationPath, 'utf8');

        await query(sql);
        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
