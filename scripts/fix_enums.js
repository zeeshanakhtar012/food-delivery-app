const { query } = require('../config/db');

async function fixEnums() {
    console.log('🚀 Fixing enum types (adding missing values)...');

    const enumsToUpdate = [
        { type: 'order_type', values: ['dine_in', 'takeaway'] },
        { type: 'order_status', values: ['ready', 'completed'] }
    ];

    for (const { type, values } of enumsToUpdate) {
        for (const value of values) {
            try {
                // ALTER TYPE ... ADD VALUE cannot be executed in a transaction block
                // and it doesn't support IF NOT EXISTS in all Postgres versions.
                // We check if it exists first.
                const check = await query(`
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = $1 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $2)
                `, [value, type]);

                if (check.rows.length === 0) {
                    console.log(`➕ Adding value "${value}" to enum "${type}"...`);
                    // We must use a direct query here, and ideally NOT in a transaction
                    await query(`ALTER TYPE ${type} ADD VALUE '${value}'`);
                    console.log(`✅ Added "${value}" to "${type}".`);
                } else {
                    console.log(`ℹ️ Value "${value}" already exists in "${type}".`);
                }
            } catch (error) {
                console.error(`❌ Error adding "${value}" to "${type}":`, error.message);
            }
        }
    }

    console.log('🎉 Enum fix completed.');
    process.exit(0);
}

fixEnums();
