-- Payment tracking table for reliable billing
CREATE TABLE IF NOT EXISTS payment_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66),
    amount_eth DECIMAL(18, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'expired')),
    verification_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_payment_tracking_user_id ON payment_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_tx_hash ON payment_tracking(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_status ON payment_tracking(status);