/**
 * renderMigration.js
 * Runs critical schema patches on the Render PostgreSQL database.
 * Usage: DATABASE_URL="postgresql://..." node scripts/renderMigration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌  Set DATABASE_URL env var first:');
        console.error('   DATABASE_URL="postgresql://user:pass@host/db" node scripts/renderMigration.js');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('✅  Connected to Render PostgreSQL\n');

        const patches = [
            {
                name: "Add 'completed' to order_status enum",
                sql: `
                    DO $$ BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_enum
                            WHERE enumlabel = 'completed'
                            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
                        ) THEN
                            ALTER TYPE order_status ADD VALUE 'completed';
                        END IF;
                    END$$;
                `,
            },
            {
                name: "Add 'dine_in' and 'takeaway' to order_type enum",
                sql: `
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'dine_in'   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')) THEN
                            ALTER TYPE order_type ADD VALUE 'dine_in';
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'takeaway' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')) THEN
                            ALTER TYPE order_type ADD VALUE 'takeaway';
                        END IF;
                    END$$;
                `,
            },
            {
                name: 'Add addons JSONB column to order_items',
                sql: `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb;`,
            },
            {
                name: 'Add stock_quantity to foods',
                sql: `ALTER TABLE foods ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;`,
            },
            {
                name: 'Add is_unlimited to foods',
                sql: `ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT TRUE;`,
            },
            {
                name: 'Add is_featured to foods',
                sql: `ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;`,
            },
            {
                name: 'Add customer_name / customer_phone / table_id / guest_count to orders',
                sql: `
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_count INTEGER;
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
                `,
            },
            {
                name: 'Create restaurant_tables table',
                sql: `
                    CREATE TABLE IF NOT EXISTS restaurant_tables (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
                        table_number VARCHAR(50) NOT NULL,
                        capacity INTEGER DEFAULT 4,
                        status VARCHAR(50) DEFAULT 'available',
                        qr_code_url TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(restaurant_id, table_number)
                    );
                `,
            },
            {
                name: 'Add table_id FK to orders',
                sql: `
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id UUID;
                    DO $$ BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.table_constraints
                            WHERE constraint_name = 'orders_table_id_fkey'
                        ) THEN
                            ALTER TABLE orders ADD CONSTRAINT orders_table_id_fkey
                                FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL;
                        END IF;
                    END$$;
                `,
            },
            {
                name: 'Create reservations table',
                sql: `
                    CREATE TABLE IF NOT EXISTS reservations (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
                        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                        table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
                        customer_name VARCHAR(255) NOT NULL,
                        customer_phone VARCHAR(50) NOT NULL,
                        guest_count INTEGER NOT NULL DEFAULT 1,
                        reservation_time TIMESTAMP NOT NULL,
                        status VARCHAR(50) DEFAULT 'pending',
                        special_requests TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_id ON reservations(restaurant_id);
                `,
            },
        ];

        for (const patch of patches) {
            process.stdout.write(`⏳  ${patch.name}... `);
            try {
                await client.query(patch.sql);
                console.log('✅');
            } catch (err) {
                console.log(`⚠️  Skipped (${err.message.split('\n')[0]})`);
            }
        }

        console.log('\n🎉  All migrations completed on Render!\n');
    } finally {
        await client.end();
    }
}

runMigration().catch(err => {
    console.error('❌  Fatal:', err.message);
    process.exit(1);
});
