-- Migration: Add Rider Professional Features (Status, Wallet, avatar_url)

-- 1. Create rider_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rider_status') THEN
        CREATE TYPE rider_status AS ENUM ('online', 'offline', 'busy');
    END IF;
END$$;

-- 2. Add avatar_url to users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
END$$;

-- 3. Add professional columns to riders table
DO $$
BEGIN
    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'status') THEN
        ALTER TABLE riders ADD COLUMN status rider_status DEFAULT 'offline';
    END IF;

    -- wallet_balance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'wallet_balance') THEN
        ALTER TABLE riders ADD COLUMN wallet_balance DECIMAL(10, 2) DEFAULT 0.00;
    END IF;

    -- total_earnings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'total_earnings') THEN
        ALTER TABLE riders ADD COLUMN total_earnings DECIMAL(10, 2) DEFAULT 0.00;
    END IF;
END$$;

-- 4. Create rider_wallet_transactions table
CREATE TABLE IF NOT EXISTS rider_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- earning, withdrawal, adjustment
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'completed', -- pending, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create rider_withdrawals table
CREATE TABLE IF NOT EXISTS rider_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(255),
    account_holder_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, processed, rejected
    processed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Add Indexes
CREATE INDEX IF NOT EXISTS idx_rider_wallet_transactions_rider_id ON rider_wallet_transactions(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_withdrawals_rider_id ON rider_withdrawals(rider_id);
