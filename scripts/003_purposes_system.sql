-- Add purposes table for user-created purposes
CREATE TABLE IF NOT EXISTS purposes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#cdb4db', -- Default to thistle color
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate purpose names per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_purposes_user_name ON purposes(user_id, LOWER(name));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purposes_user_id ON purposes(user_id);
CREATE INDEX IF NOT EXISTS idx_purposes_created_at ON purposes(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_purposes_updated_at BEFORE UPDATE ON purposes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default "reflection" purpose for existing users
INSERT INTO purposes (user_id, name, description, is_default)
SELECT id, 'Reflection', 'Daily thoughts and self-reflection', TRUE
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM purposes WHERE purposes.user_id = users.id AND purposes.name = 'Reflection'
);

-- Update recordings table to reference purposes instead of hardcoded values
ALTER TABLE recordings DROP CONSTRAINT IF EXISTS recordings_purpose_check;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS purpose_id UUID REFERENCES purposes(id) ON DELETE SET NULL;

-- Update chat_sessions table similarly
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_purpose_check;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS purpose_id UUID REFERENCES purposes(id) ON DELETE SET NULL;

-- Create function to ensure users always have a default reflection purpose
CREATE OR REPLACE FUNCTION ensure_default_purpose()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO purposes (user_id, name, description, is_default)
    VALUES (NEW.id, 'Reflection', 'Daily thoughts and self-reflection', TRUE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default purpose when new user is created
CREATE TRIGGER create_default_purpose_for_new_user
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_default_purpose();
