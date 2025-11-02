/**
 * Script to create audit_logs table if it doesn't exist
 */

const { query } = require('../config/db');

async function createAuditLogsTable() {
  try {
    console.log('🔧 Creating audit_logs table...\n');

    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        user_type VARCHAR(50), -- 'super_admin', 'restaurant_admin', 'rider', 'user'
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for better query performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)
    `);

    console.log('✅ audit_logs table created successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating audit_logs table:', error.message);
    process.exit(1);
  }
}

// Run the script
createAuditLogsTable();

