-- Drop problematic FK constraint on table_id (business logic handles validation)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_table_id_fkey;

-- Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservation_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- Add rider block columns
ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
