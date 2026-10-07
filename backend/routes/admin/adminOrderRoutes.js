import express from 'express';
import { z } from 'zod';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { formatOrderResponse } from '../orderRoutes.js';

const router = express.Router();

export const ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const updateSchema = z.object({
  orderStatus: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  trackingNumber: z.string().max(100).optional(),
  courierName: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

const requireDb = (res) => {
  if (!supabase) {
    res.status(503).json({ message: 'Database is not configured.' });
    return false;
  }
  return true;
};

// GET /api/admin/orders — paginated, filterable list
router.get('/', requireAdminAuth, requirePermission('orders:read'), async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { status, payment, search } = req.query;

    let query = supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (status && ORDER_STATUSES.includes(status)) query = query.eq('order_status', status);
    if (payment && PAYMENT_STATUSES.includes(payment)) query = query.eq('payment_status', payment);
    if (search) {
      const term = String(search).replace(/[%,()]/g, '').trim();
      if (term) query = query.or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%,customer_phone.ilike.%${term}%`);
    }

    const { data, count, error } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error(error.message);

    return res.json({
      orders: (data || []).map(formatOrderResponse),
      pagination: { page, limit, total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / limit)) },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/:id', requireAdminAuth, requirePermission('orders:read'), async (req, res) => {
  if (!requireDb(res)) return;
  const { data, error } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (error || !data) return res.status(404).json({ message: 'Order not found' });
  return res.json({ order: formatOrderResponse(data) });
});

router.patch('/:id', requireAdminAuth, requirePermission('orders:write'), validate(updateSchema), async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const { orderStatus, paymentStatus, trackingNumber, courierName, notes } = req.body;
    const fields = { updated_at: new Date().toISOString() };
    if (orderStatus !== undefined) fields.order_status = orderStatus;
    if (paymentStatus !== undefined) fields.payment_status = paymentStatus;
    if (trackingNumber !== undefined) fields.tracking_number = trackingNumber.trim();
    if (courierName !== undefined) fields.courier_name = courierName.trim();
    if (notes !== undefined) fields.notes = notes;

    const { data, error } = await supabase.from('orders').update(fields).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ message: 'Order not found' });

    await logAuditEvent({
      req,
      action: 'ORDER_UPDATED',
      resource: 'ORDERS',
      resourceId: data.id,
      details: { orderNumber: data.order_number, ...req.body },
      adminUser: req.adminUser,
    });

    return res.json({ message: 'Order updated', order: formatOrderResponse(data) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
