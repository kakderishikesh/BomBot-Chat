import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

interface RunStatusRequest {
  threadId: string;
  runId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { threadId, runId } = req.query as { threadId: string; runId: string };

  if (!threadId || !runId) {
    return res.status(400).json({ 
      error: 'Both threadId and runId are required' 
    });
  }

  try {
    // Get the run status
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (run.status === 'completed') {
      // If completed, get the messages from the thread
      const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        limit: 10
      });

      // Find the assistant's response (most recent message from assistant)
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      let responseText = '';
      if (assistantMessage && assistantMessage.content[0].type === 'text') {
        responseText = assistantMessage.content[0].text.value;
      }

      return res.status(200).json({
        status: run.status,
        completed: true,
        response: responseText,
        run: {
          id: run.id,
          created_at: run.created_at,
          completed_at: run.completed_at,
          model: run.model,
          usage: run.usage
        }
      });
    } else if (run.status === 'failed') {
      return res.status(200).json({
        status: run.status,
        completed: true,
        error: run.last_error?.message || 'Run failed with unknown error',
        run: {
          id: run.id,
          created_at: run.created_at,
          failed_at: run.failed_at,
          last_error: run.last_error
        }
      });
    } else if (run.status === 'requires_action') {
      // Handle tool calls if needed (future enhancement)
      return res.status(200).json({
        status: run.status,
        completed: false,
        requires_action: run.required_action,
        run: {
          id: run.id,
          created_at: run.created_at
        }
      });
    } else {
      // Still running or in queue
      return res.status(200).json({
        status: run.status,
        completed: false,
        run: {
          id: run.id,
          created_at: run.created_at,
          started_at: run.started_at
        }
      });
    }

  } catch (error) {
    console.error('Run status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check run status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 