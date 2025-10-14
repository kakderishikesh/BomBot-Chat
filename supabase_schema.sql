-- BOMbot Chat Logging Schema for Supabase (Single Table Design)
-- Run this SQL in your Supabase SQL Editor to create the required table

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create single chat_logs table with all information
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    thread_id VARCHAR(255),
    message_index INTEGER NOT NULL,
    message_type VARCHAR(20) CHECK (message_type IN ('user', 'assistant', 'file_upload')) NOT NULL,
    user_message TEXT,
    ai_response TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    vulnerability_count INTEGER,
    user_email VARCHAR(255),
    session_started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    session_last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_thread_id ON chat_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_email ON chat_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_chat_logs_message_index ON chat_logs(session_id, message_index);
CREATE INDEX IF NOT EXISTS idx_chat_logs_message_type ON chat_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_session_activity ON chat_logs(session_last_activity DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at and session_last_activity columns
DROP TRIGGER IF EXISTS update_chat_logs_updated_at ON chat_logs;
CREATE TRIGGER update_chat_logs_updated_at
    BEFORE UPDATE ON chat_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update session_last_activity on any change
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.session_last_activity = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update session activity
DROP TRIGGER IF EXISTS update_session_activity_trigger ON chat_logs;
CREATE TRIGGER update_session_activity_trigger
    BEFORE INSERT OR UPDATE ON chat_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_session_activity();

-- Add Row Level Security (RLS) policies
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is an internal app)
-- You may want to modify these policies based on your authentication requirements
CREATE POLICY "Enable all operations for chat_logs" ON chat_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Create a view for easy session analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    session_id,
    MIN(session_started_at) as session_started_at,
    MAX(session_last_activity) as session_last_activity,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN message_type = 'user' THEN 1 END) as user_messages,
    COUNT(CASE WHEN message_type = 'assistant' THEN 1 END) as assistant_messages,
    COUNT(CASE WHEN message_type = 'file_upload' THEN 1 END) as file_uploads,
    SUM(CASE WHEN vulnerability_count IS NOT NULL THEN vulnerability_count ELSE 0 END) as total_vulnerabilities_found,
    EXTRACT(EPOCH FROM (MAX(session_last_activity) - MIN(session_started_at))) / 60 as session_duration_minutes,
    MAX(created_at) as last_message_at
FROM chat_logs
GROUP BY session_id
ORDER BY MAX(session_last_activity) DESC;

-- Create a function to clean up old sessions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM chat_logs 
    WHERE session_last_activity < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-sessions', '0 2 * * *', 'SELECT cleanup_old_sessions();');

COMMENT ON TABLE chat_logs IS 'Stores all chat information including user messages, AI responses, file uploads, and session data';
COMMENT ON VIEW session_analytics IS 'Provides analytics view of chat sessions with aggregated statistics from the single chat_logs table';
COMMENT ON FUNCTION cleanup_old_sessions() IS 'Cleans up chat records older than 30 days'; 