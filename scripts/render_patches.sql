-- render_patches.sql
-- All idempotent schema patches for Render production DB
-- Run with: PGPASSWORD=... psql -h host -U user db -f render_patches.sql

-- 1. Add 'completed' to order_status enum
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'completed'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
    ) THEN
        ALTER TYPE order_status ADD VALUE 'completed';
    END IF;
END$$;

-- 2. Add order_type enum values if missing
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'dine_in' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')) THEN
        ALTER TYPE order_type ADD VALUE 'dine_in';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'takeaway' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')) THEN
        ALTER TYPE order_type ADD VALUE 'takeaway';
    END IF;
END$$;

-- 3. order_items: add addons column
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb;

-- 4. foods: add stock management columns
ALTER TABLE foods ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT TRUE;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 5. orders: add customer info + delivery columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_count INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- 6. Create restaurant_tables if not exists
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
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant_id ON restaurant_tables(restaurant_id);

-- 7. orders: add table_id FK
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

-- 8. Create reservations table
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

SELECT 'All patches applied successfully' AS result;
