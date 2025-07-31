import { NextApiRequest, NextApiResponse } from 'next';

// This API is kept for compatibility with the frontend but is no longer needed 
// with direct chat completions. The new chat API returns responses immediately.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // For compatibility, immediately return completed status
  // The frontend should use the direct response from /api/chat instead
  return res.status(200).json({
    status: 'completed',
    completed: true,
    response: 'This endpoint is deprecated. Use direct response from /api/chat.',
    info: 'The new chat API returns responses immediately without requiring polling.'
  });
} 