const { query } = require('../config/db');

async function migrateSessionToken() {
    console.log('Starting migration: Add session_token to admins table...');
    try {
        await query(`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS session_token VARCHAR(255);
    `);
        console.log(' Migration successful: session_token added to admins table.');
    } catch (error) {
        console.error(' Migration failed:', error.message);
    } finally {
        process.exit();
    }
}

migrateSessionToken();
