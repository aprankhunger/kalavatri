import express from 'express';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { isMissingTableError } from '../../utils/storeSettings.js';

const router = express.Router();

// Customers are guest buyers, aggregated from orders by email
router.get('/', requireAdminAuth, requirePermission('customers:read'), async (req, res) => {
  if (!supabase) return res.json({ customers: [], subscribers: [] });
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('customer_name, customer_email, customer_phone, city, state, total_amount, order_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const byEmail = new Map();
    for (const o of data || []) {
      const key = (o.customer_email || '').toLowerCase();
      if (!key) continue;
      const existing = byEmail.get(key) || {
        email: key,
        name: o.customer_name,
        phone: o.customer_phone,
        city: o.city,
        state: o.state,
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: o.created_at,
        firstOrderAt: o.created_at,
      };
      existing.orderCount += 1;
      if (o.order_status !== 'cancelled') existing.totalSpent += Number(o.total_amount || 0);
      existing.firstOrderAt = o.created_at;
      byEmail.set(key, existing);
    }

    let customers = [...byEmail.values()];
    const search = String(req.query.search || '').trim().toLowerCase();
    if (search) {
      customers = customers.filter(
        (c) => c.email.includes(search) || (c.name || '').toLowerCase().includes(search) || (c.phone || '').includes(search)
      );
    }
    customers.sort((a, b) => b.totalSpent - a.totalSpent);

    const { data: subs, error: subsError } = await supabase
      .from('newsletter_subscribers')
      .select('email, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    return res.json({
      customers,
      subscribers: subsError && isMissingTableError(subsError) ? [] : subs || [],
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
