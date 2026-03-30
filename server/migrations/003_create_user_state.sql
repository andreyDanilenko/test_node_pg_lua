CREATE TABLE IF NOT EXISTS user_reward_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_day INTEGER NOT NULL DEFAULT 1,
    last_claimed_at TIMESTAMP WITH TIME ZONE,
    streak_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_reward_state_updated_at ON user_reward_state;
CREATE TRIGGER update_user_reward_state_updated_at
    BEFORE UPDATE ON user_reward_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
