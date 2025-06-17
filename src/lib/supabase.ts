import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types for single table design
export interface ChatLog {
  id: string;
  session_id: string;
  thread_id: string | null;
  message_index: number;
  message_type: 'user' | 'assistant' | 'file_upload';
  user_message: string | null;
  ai_response: string | null;
  file_name: string | null;
  file_size: number | null;
  vulnerability_count: number | null;
  session_started_at: string;
  session_last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface SessionAnalytics {
  session_id: string;
  session_started_at: string;
  session_last_activity: string;
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  file_uploads: number;
  total_vulnerabilities_found: number;
  session_duration_minutes: number;
  last_message_at: string;
} 