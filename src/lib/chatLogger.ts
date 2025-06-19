import { supabase, ChatLog } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface LogChatMessageParams {
  sessionId: string;
  threadId?: string | null;
  messageIndex: number;
  messageType: 'user' | 'assistant' | 'file_upload';
  userMessage?: string | null;
  aiResponse?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  vulnerabilityCount?: number | null;
  userEmail?: string | null;
}

export class ChatLogger {
  static async logMessage(params: LogChatMessageParams): Promise<ChatLog | null> {
    try {
      const now = new Date().toISOString();
      
      const logEntry: Partial<ChatLog> = {
        id: uuidv4(),
        session_id: params.sessionId,
        thread_id: params.threadId || null,
        message_index: params.messageIndex,
        message_type: params.messageType,
        user_message: params.userMessage || null,
        ai_response: params.aiResponse || null,
        file_name: params.fileName || null,
        file_size: params.fileSize || null,
        vulnerability_count: params.vulnerabilityCount || null,
        user_email: params.userEmail || null,
        session_started_at: now, // Will be overridden by trigger if not first message
        session_last_activity: now,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('chat_logs')
        .insert([logEntry])
        .select()
        .single();

      if (error) {
        console.error('Error logging chat message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in ChatLogger.logMessage:', error);
      return null;
    }
  }

  static async updateMessageResponse(
    sessionId: string,
    messageIndex: number,
    aiResponse: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_logs')
        .update({
          ai_response: aiResponse,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .eq('message_index', messageIndex);

      if (error) {
        console.error('Error updating message response:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in ChatLogger.updateMessageResponse:', error);
      return false;
    }
  }

  static async initializeSession(sessionId: string): Promise<boolean> {
    try {
      // With single table design, we don't need to pre-initialize sessions
      // The session data is automatically handled when first message is logged
      console.log(`Session ${sessionId} will be initialized on first message`);
      return true;
    } catch (error) {
      console.error('Error in ChatLogger.initializeSession:', error);
      return false;
    }
  }

  static async getSessionAnalytics(sessionId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching session analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in ChatLogger.getSessionAnalytics:', error);
      return null;
    }
  }

  static async getChatHistory(sessionId: string): Promise<ChatLog[]> {
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('message_index', { ascending: true });

      if (error) {
        console.error('Error fetching chat history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in ChatLogger.getChatHistory:', error);
      return [];
    }
  }
} 