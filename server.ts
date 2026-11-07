import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './server/routes/authRoutes.ts';
import gigRoutes from './server/routes/gigRoutes.ts';
import serviceRoutes from './server/routes/serviceRoutes.ts';
import walletRoutes from './server/routes/walletRoutes.ts';
import adminRoutes from './server/routes/adminRoutes.ts';
import chatbotRoutes from './server/routes/chatbotRoutes.ts';
import announcementRoutes from './server/routes/announcementRoutes.ts';
import notificationRoutes from './server/routes/notificationRoutes.ts';
import eventsRoutes from './server/routes/eventsRoutes.ts';
import mapRoutes from './server/routes/mapRoutes.ts';
import reviewRoutes from './server/routes/reviewRoutes.ts';
import { db } from './server/db.ts';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/gigs', gigRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/wallets', walletRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/support-chatbot', chatbotRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/maps', mapRoutes);
  app.use('/api/reviews', reviewRoutes);

  // Public Commission Settings (for real-time tier calculation across portals)
  app.get('/api/commission-settings', (req, res) => {
    res.json({ settings: db.getPlatformSettings() });
  });

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Frontend Serving (Vite middleware in dev, static files in production)
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`🚀 TaskHub Full-Stack Server active on http://0.0.0.0:${PORT}`);
    console.log(`📡 Real-Time SSE Stream: /api/events`);
    console.log(`🤖 AI Support Chatbot: /api/support-chatbot`);
    console.log(`🛡️ Master Admin Gateway: /admin/login`);
    console.log(`==================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting TaskHub server:', err);
  process.exit(1);
});
