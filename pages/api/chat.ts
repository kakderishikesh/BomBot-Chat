import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

interface ChatRequest {
  message: string;
  threadId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, threadId }: ChatRequest = req.body;

  if (!message || !threadId) {
    return res.status(400).json({ 
      error: 'Message and threadId are required' 
    });
  }

  try {
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
      message: message
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Failed to send message to assistant',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 