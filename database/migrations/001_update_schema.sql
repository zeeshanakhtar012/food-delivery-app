-- Migration: Add missing tables and columns for Dine-in/Order features

-- 1. Create order_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
        CREATE TYPE order_type AS ENUM ('delivery', 'pickup', 'dine_in', 'takeaway');
    ELSE
        -- If it exists, ensure 'dine_in' and 'takeaway' are added
        ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'dine_in';
        ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'takeaway';
    END IF;
END$$;

-- 2. Create restaurant_tables table if it doesn't exist
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    capacity INTEGER DEFAULT 4,
    status VARCHAR(50) DEFAULT 'available', -- available, occupied, reserved
    qr_code_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, table_number)
);

-- 3. Add columns to orders table
DO $$
BEGIN
    -- order_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type') THEN
        ALTER TABLE orders ADD COLUMN order_type order_type DEFAULT 'delivery';
    END IF;

    -- table_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'table_id') THEN
        ALTER TABLE orders ADD COLUMN table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL;
    END IF;

    -- guest_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'guest_count') THEN
        ALTER TABLE orders ADD COLUMN guest_count INTEGER;
    END IF;

    -- delivery_instructions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_instructions') THEN
        ALTER TABLE orders ADD COLUMN delivery_instructions TEXT;
    END IF;
    
    -- Make user_id nullable if it isn't already (for guest checkout/dine-in)
    ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
    
    -- Make delivery_lat/lng nullable (for dine-in)
    ALTER TABLE orders ALTER COLUMN delivery_lat DROP NOT NULL;
    ALTER TABLE orders ALTER COLUMN delivery_lng DROP NOT NULL;

END$$;

-- 4. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant_id ON restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
