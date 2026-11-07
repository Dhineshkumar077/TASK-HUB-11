import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from '../server/routes/authRoutes.ts';
import gigRoutes from '../server/routes/gigRoutes.ts';
import serviceRoutes from '../server/routes/serviceRoutes.ts';
import walletRoutes from '../server/routes/walletRoutes.ts';
import adminRoutes from '../server/routes/adminRoutes.ts';
import chatbotRoutes from '../server/routes/chatbotRoutes.ts';
import announcementRoutes from '../server/routes/announcementRoutes.ts';
import notificationRoutes from '../server/routes/notificationRoutes.ts';
import eventsRoutes from '../server/routes/eventsRoutes.ts';
import mapRoutes from '../server/routes/mapRoutes.ts';
import reviewRoutes from '../server/routes/reviewRoutes.ts';
import { db } from '../server/db.ts';

dotenv.config();

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const url = req.url || '/';
  if (url.startsWith('/api')) {
    req.url = url.slice(4) || '/';
  }
  next();
});

app.use('/auth', authRoutes);
app.use('/gigs', gigRoutes);
app.use('/services', serviceRoutes);
app.use('/wallets', walletRoutes);
app.use('/admin', adminRoutes);
app.use('/support-chatbot', chatbotRoutes);
app.use('/announcements', announcementRoutes);
app.use('/notifications', notificationRoutes);
app.use('/events', eventsRoutes);
app.use('/maps', mapRoutes);
app.use('/reviews', reviewRoutes);

app.get(['/commission-settings', '/api/commission-settings'], (req, res) => {
  res.json({ settings: db.getPlatformSettings() });
});

app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

export default app;
