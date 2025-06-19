import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { supabaseServer } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

interface ChatRequest {
  message: string;
  threadId: string;
  sessionId: string;
  messageIndex: number;
  userEmail?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, threadId, sessionId, messageIndex, userEmail }: ChatRequest = req.body;

  if (!message || !threadId || !sessionId || messageIndex === undefined) {
    return res.status(400).json({ 
      error: 'Message, threadId, sessionId, and messageIndex are required' 
    });
  }

  try {
    // Log user message to Supabase
    try {
              await supabaseServer
        .from('chat_logs')
        .insert([{
          id: uuidv4(),
          session_id: sessionId,
          thread_id: threadId,
          message_index: messageIndex,
          message_type: 'user',
          user_message: message,
          ai_response: null,
          file_name: null,
          file_size: null,
          vulnerability_count: null,
          user_email: userEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
    } catch (logError) {
      console.error('Error logging user message:', logError);
      // Continue with the chat even if logging fails
    }

    // Send the message to the existing thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    // Create a run with the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID!,
    });

    return res.status(200).json({ 
      success: true,
      runId: run.id,
      threadId: threadId,
      message: message,
      sessionId: sessionId,
      messageIndex: messageIndex
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Failed to send message to assistant',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 