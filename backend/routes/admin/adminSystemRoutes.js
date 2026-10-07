import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { isMissingTableError } from '../../utils/storeSettings.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.join(__dirname, '../../migrations/002_cms_coupons_categories.sql');
const REQUIRED_TABLES = ['categories', 'coupons', 'site_settings', 'newsletter_subscribers'];

// GET /api/admin/system/status — which CMS tables exist
router.get('/status', requireAdminAuth, async (req, res) => {
  const tables = {};
  if (supabase) {
    await Promise.all(
      REQUIRED_TABLES.map(async (t) => {
        const { error } = await supabase.from(t).select('*', { head: true, count: 'exact' }).limit(1);
        tables[t] = !(error && isMissingTableError(error));
      })
    );
  }
  let migrationSql = '';
  try {
    migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  } catch {
    migrationSql = '';
  }
  const migrationRequired = Object.values(tables).some((ok) => !ok);
  return res.json({ databaseConnected: !!supabase, tables, migrationRequired, migrationSql: migrationRequired ? migrationSql : '' });
});

// GET /api/admin/system/dashboard — headline metrics
router.get('/dashboard', requireAdminAuth, requirePermission('orders:read'), async (req, res) => {
  if (!supabase) return res.json({ revenue: 0, orders: 0, pendingOrders: 0, customers: 0, products: 0, lowStock: 0, recentOrders: [], salesByDay: [] });
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: orders }, { data: products }] = await Promise.all([
      supabase.from('orders').select('order_number, customer_name, customer_email, total_amount, order_status, payment_status, created_at').order('created_at', { ascending: false }).limit(2000),
      supabase.from('products').select('stock_quantity, low_stock_threshold').eq('is_deleted', false),
    ]);

    const valid = (orders || []).filter((o) => o.order_status !== 'cancelled');
    const recent30 = valid.filter((o) => o.created_at >= since);
    const days = new Map();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.set(d, 0);
    }
    valid.forEach((o) => {
      const d = o.created_at?.slice(0, 10);
      if (days.has(d)) days.set(d, days.get(d) + Number(o.total_amount || 0));
    });

    return res.json({
      revenue: recent30.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      orders: recent30.length,
      pendingOrders: (orders || []).filter((o) => ['placed', 'confirmed', 'processing'].includes(o.order_status)).length,
      customers: new Set((orders || []).map((o) => (o.customer_email || '').toLowerCase())).size,
      products: (products || []).length,
      lowStock: (products || []).filter((p) => (p.stock_quantity || 0) <= (p.low_stock_threshold || 5)).length,
      recentOrders: (orders || []).slice(0, 6).map((o) => ({
        orderNumber: o.order_number,
        customerName: o.customer_name,
        totalAmount: Number(o.total_amount),
        orderStatus: o.order_status,
        paymentStatus: o.payment_status,
        createdAt: o.created_at,
      })),
      salesByDay: [...days.entries()].map(([date, total]) => ({ date, total })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
