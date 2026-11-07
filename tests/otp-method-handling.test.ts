import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import authRoutes from '../server/routes/authRoutes.ts';

async function makeRequest(path: string, method: string, body?: object) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });
  app.use('/api/auth', authRoutes);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Invalid server address');
  }

  try {
    const url = `http://127.0.0.1:${address.port}${path}`;
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('OTP auth routes accept OPTIONS and POST payloads', async () => {
  const options = await makeRequest('/api/auth/send-otp', 'OPTIONS');
  assert.equal(options.status, 204, 'OPTIONS should be allowed for the OTP endpoint');
  assert.equal(options.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');

  const post = await makeRequest('/api/auth/verify-otp', 'POST', {
    target: 'user@example.com',
    channel: 'EMAIL',
    code: '123456',
  });

  assert.notEqual(post.status, 405, 'POST verify-otp should not be rejected with 405');
  assert.match(post.text, /error|success|message/i, 'OTP route should return a valid JSON response body');
});
