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
import adminOrderRoutes from './routes/admin/adminOrderRoutes.js';
import adminCustomerRoutes from './routes/admin/adminCustomerRoutes.js';
import adminCouponRoutes from './routes/admin/adminCouponRoutes.js';
import adminCategoryRoutes from './routes/admin/adminCategoryRoutes.js';
import adminContentRoutes from './routes/admin/adminContentRoutes.js';
import adminStaffRoutes from './routes/admin/adminStaffRoutes.js';
import adminSystemRoutes from './routes/admin/adminSystemRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
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
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/customers', adminCustomerRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/content', adminContentRoutes);
app.use('/api/admin/staff', adminStaffRoutes);
app.use('/api/admin/system', adminSystemRoutes);
app.use('/api/store', storeRoutes);

// Health check & root route
app.get(['/', '/api'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'kalavatri-backend',
    database: supabase ? 'connected' : 'unconfigured',
  });
});

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
// Seeding is a one-off provisioning step, not something to run on every
// serverless cold start. Run it automatically only outside Vercel (local dev),
// or on demand via `node seed/supabaseSeed.js` / SEED_ON_START=true.
const shouldAutoSeed = supabase && (!process.env.VERCEL || process.env.SEED_ON_START === 'true');
if (shouldAutoSeed) {
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
