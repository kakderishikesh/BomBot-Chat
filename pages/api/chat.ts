import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';
import { chatCompletion, detectFunctionCall, executeFunctionCall, ChatMessage } from '@/lib/ai-client';

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  sessionId: string;
  messageIndex: number;
  userEmail?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, conversationHistory = [], sessionId, messageIndex, userEmail }: ChatRequest = req.body;

  if (!message || !sessionId || messageIndex === undefined) {
    return res.status(400).json({ 
      error: 'Message, sessionId, and messageIndex are required' 
    });
  }

  // Generate conversation ID for this chat
  const conversationId = uuidv4();
  
  try {
    // Log user message to Supabase
    try {
      await supabaseServer
        .from('chat_logs')
        .insert([{
          id: uuidv4(),
          session_id: sessionId,
          thread_id: conversationId,
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

    // Check if the message requires function calling
    const functionCall = detectFunctionCall(message);
    
    // Build conversation history
    const messages: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    let aiResponse = '';
    
    if (functionCall) {
      try {
        // Execute the function call
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        
        const functionResult = await executeFunctionCall(functionCall.function, functionCall.args, baseUrl);
        
        // Add function result to conversation and get AI response
        const messagesWithFunction: ChatMessage[] = [
          ...messages,
          { 
            role: 'user', 
            content: `Function ${functionCall.function} returned: ${functionResult}\n\nPlease provide a clear, actionable summary of this vulnerability data with OSV.dev links. Keep it brief and suggest I can ask for "detailed analysis" if needed.`
          }
        ];
        
        const completion = await chatCompletion(messagesWithFunction);
        aiResponse = completion.content;
        
      } catch (functionError) {
        console.error('Function execution error:', functionError);
        // Fall back to regular chat completion
        const completion = await chatCompletion(messages);
        aiResponse = completion.content;
      }
    } else {
      // Regular chat completion
      const completion = await chatCompletion(messages);
      aiResponse = completion.content;
    }

    // Log AI response to Supabase
    try {
      await supabaseServer
        .from('chat_logs')
        .update({
          ai_response: aiResponse,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .eq('message_index', messageIndex);
    } catch (logError) {
      console.error('Error logging AI response:', logError);
      // Continue even if logging fails
    }

    return res.status(200).json({ 
      success: true,
      response: aiResponse,
      conversationId: conversationId,
      message: message,
      sessionId: sessionId,
      messageIndex: messageIndex
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle context limit exceeded error with friendly message
    if (error instanceof Error && error.message === 'CONTEXT_LIMIT_EXCEEDED') {
      return res.status(200).json({ 
        success: true,
        response: `🤖 **Context Limit Reached**

I've reached my conversation memory limit! Our chat has gotten quite long and I need to start fresh to continue helping you effectively.

**What this means:**
- The AI model can only remember a certain amount of conversation history
- We've hit that limit after our productive discussion

**What to do next:**
- Click the "✚ New Chat" button to start a fresh conversation
- I'll be ready to help with your security analysis questions
- You can re-upload any SBOM files if needed

**Don't worry** - starting fresh won't affect my ability to help you with vulnerability analysis, package queries, or SBOM scanning! 

Thanks for understanding! 🚀`,
        isContextLimitError: true,
        conversationId: conversationId,
        message: message,
        sessionId: sessionId,
        messageIndex: messageIndex
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 