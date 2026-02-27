/**
 * renderWipe.js
 * Drops the entire public schema and rebuilds it using complete_migration.sql
 * WARNING: This will permanently delete ALL data.
 * Usage: DATABASE_URL="postgresql://..." node scripts/renderWipe.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function wipeAndRebuild() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌  Set DATABASE_URL env var first:');
        console.error('   DATABASE_URL="postgresql://user:pass@host/db" node scripts/renderWipe.js');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('✅  Connected to Render PostgreSQL\n');

        console.log('⚠️  WARNING: Wiping entire public schema in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🗑️   Dropping schema...');
        await client.query('DROP SCHEMA public CASCADE;');
        await client.query('CREATE SCHEMA public;');
        console.log('✅  Schema dropped and recreated.\n');

        console.log('🏗️   Running complete_migration.sql...');
        const migrationPath = path.join(__dirname, '..', 'complete_migration.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        await client.query(migrationSql);
        console.log('✅  Base schema created successfully.\n');

        console.log('🎉  Database wipe and rebuild complete!');

    } catch (err) {
        console.error('❌  Fatal error:', err);
    } finally {
        await client.end();
    }
}

wipeAndRebuild();
