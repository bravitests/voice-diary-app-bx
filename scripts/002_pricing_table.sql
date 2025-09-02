-- Pricing table for admin management
CREATE TABLE IF NOT EXISTS pricing (
    id INTEGER PRIMARY KEY DEFAULT 1,
    monthly_usd DECIMAL(10, 2) DEFAULT 35.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO pricing (id, monthly_usd) VALUES (1, 0.99) ON CONFLICT (id) DO NOTHING;

-- Update existing pricing to correct amount
UPDATE pricing SET monthly_usd = 0.99 WHERE id = 1;

-- Update trigger for pricing table
CREATE TRIGGER update_pricing_updated_at BEFORE UPDATE ON pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();