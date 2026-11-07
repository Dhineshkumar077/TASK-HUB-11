import { Router } from 'express';
import type { Request, Response } from 'express';
import { askTaskHubSupportChatbot } from '../gemini.ts';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { message, userRole, userName } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message query is required.' });
    return;
  }

  try {
    const reply = await askTaskHubSupportChatbot(message, userRole, userName);
    res.json({ reply });
  } catch (err: any) {
    console.error('Chatbot error:', err);
    res.status(500).json({ error: 'Failed to process AI support inquiry.' });
  }
});

export default router;
