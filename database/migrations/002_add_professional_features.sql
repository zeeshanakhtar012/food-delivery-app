-- Migration: Add Professional Features (Addons, Reservations, Enhanced Orders)

-- 1. Create food_addons table
CREATE TABLE IF NOT EXISTS food_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_required BOOLEAN DEFAULT FALSE,
    option_type VARCHAR(50) DEFAULT 'single', -- 'single' (radio) or 'multiple' (checkbox)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional linking to registered user
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 2,
    reservation_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed, no_show
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add addons column to order_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'addons') THEN
        ALTER TABLE order_items ADD COLUMN addons JSONB DEFAULT '[]'::jsonb;
    END IF;
END$$;

-- 4. Add reservation_id to orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'reservation_id') THEN
        ALTER TABLE orders ADD COLUMN reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL;
    END IF;
END$$;

-- 5. Add stock_quantity to foods
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'foods' AND column_name = 'stock_quantity') THEN
        ALTER TABLE foods ADD COLUMN stock_quantity INTEGER DEFAULT 100;
    END IF;
END$$;

-- 6. Add Indexes
CREATE INDEX IF NOT EXISTS idx_food_addons_food_id ON food_addons(food_id);
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_id ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_time ON reservations(reservation_time);
