import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';

import supabase from './db/supabase.js';
import productRoutes from './routes/productRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminAuthRoutes from './routes/admin/adminAuthRoutes.js';
import adminAuditRoutes from './routes/admin/adminAuditRoutes.js';
import adminProductRoutes from './routes/admin/adminProductRoutes.js';
import adminInventoryRoutes from './routes/admin/adminInventoryRoutes.js';
import { seedSupabase } from './seed/supabaseSeed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5000', 'https://api.postalpincode.in'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration (allow cookies from authorized frontend)
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Public Routes
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);

// Admin Routes (isolated namespace)
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/audit-logs', adminAuditRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Kalavatri API is running',
    timestamp: new Date().toISOString(),
    database: supabase ? 'supabase-connected' : 'unconfigured',
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

// Server Initialization
if (supabase) {
  seedSupabase()
    .then(() => console.log('✅ Supabase database initialized and seeded'))
    .catch((err) => console.warn('⚠️ Supabase seed warning:', err.message));
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT} (${supabase ? 'Supabase mode' : 'Offline fallback mode'})`);
  });
}

export default app;
