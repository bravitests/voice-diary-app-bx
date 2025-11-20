-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Free', 'Starter', 'Pro'
    price INTEGER NOT NULL DEFAULT 0, -- Price in KSH
    currency VARCHAR(3) DEFAULT 'KES',
    interval VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'
    paystack_plan_code VARCHAR(100), -- Code from Paystack
    limits JSONB NOT NULL DEFAULT '{}', -- { "recording_limit_seconds": 120, "entries_per_month": 10, "chats_per_day": 5 }
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create paystack_subscriptions table
CREATE TABLE IF NOT EXISTS paystack_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    paystack_subscription_code VARCHAR(100), -- Code from Paystack subscription
    paystack_customer_code VARCHAR(100),
    paystack_email_token VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'non-renewing', 'attention', 'completed', 'cancelled'
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_paystack_subscriptions_user_id ON paystack_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_paystack_subscriptions_status ON paystack_subscriptions(status);

-- Insert default plans
INSERT INTO subscription_plans (name, price, limits, is_active)
VALUES 
    ('Free', 0, '{"recording_limit_seconds": 120, "entries_per_month": 10, "chats_per_day": 5}', TRUE),
    ('Starter', 100, '{"recording_limit_seconds": 300, "entries_per_month": 30, "chats_per_day": 20}', TRUE),
    ('Pro', 200, '{"recording_limit_seconds": 600, "entries_per_month": 1000, "chats_per_day": 100}', TRUE)
ON CONFLICT (name) DO NOTHING;
