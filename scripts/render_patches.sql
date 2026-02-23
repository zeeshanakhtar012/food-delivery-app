-- Drop problematic FK constraint on table_id (business logic handles validation)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_table_id_fkey;

-- Add rider block columns
ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
