import express from 'express';
import { z } from 'zod';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { formatCoupon } from '../../utils/couponEngine.js';
import { isMissingTableError } from '../../utils/storeSettings.js';

const router = express.Router();

const nullableInt = z.number().int().min(1).nullable().optional();
const nullableDate = z.string().nullable().optional().transform((v) => (v ? new Date(v).toISOString() : null));

const couponSchema = z
  .object({
    code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - or _ only').transform((v) => v.toUpperCase()),
    description: z.string().max(200).optional().default(''),
    discountType: z.enum(['percent', 'fixed']),
    discountValue: z.number().positive(),
    minOrderAmount: z.number().min(0).optional().default(0),
    maxDiscountAmount: z.number().positive().nullable().optional(),
    usageLimit: nullableInt,
    perCustomerLimit: nullableInt,
    startsAt: nullableDate,
    expiresAt: nullableDate,
    isActive: z.boolean().optional().default(true),
  })
  .refine((c) => c.discountType !== 'percent' || c.discountValue <= 100, { message: 'Percent discount cannot exceed 100', path: ['discountValue'] });

const toRow = (c) => ({
  code: c.code,
  description: c.description,
  discount_type: c.discountType,
  discount_value: c.discountValue,
  min_order_amount: c.minOrderAmount,
  max_discount_amount: c.maxDiscountAmount ?? null,
  usage_limit: c.usageLimit ?? null,
  per_customer_limit: c.perCustomerLimit ?? null,
  starts_at: c.startsAt,
  expires_at: c.expiresAt,
  is_active: c.isActive,
  updated_at: new Date().toISOString(),
});

const handleDbError = (res, error) => {
  if (isMissingTableError(error)) {
    return res.status(409).json({ message: 'Coupons table missing. Run the database migration from Store Settings → Database.', code: 'MIGRATION_REQUIRED' });
  }
  if (error.code === '23505') return res.status(409).json({ message: 'A coupon with this code already exists.' });
  return res.status(500).json({ message: error.message });
};

router.get('/', requireAdminAuth, requirePermission('coupons:read'), async (req, res) => {
  if (!supabase) return res.json({ coupons: [] });
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) return handleDbError(res, error);
  return res.json({ coupons: data.map(formatCoupon) });
});

router.post('/', requireAdminAuth, requirePermission('coupons:write'), validate(couponSchema), async (req, res) => {
  if (!supabase) return res.status(503).json({ message: 'Database is not configured.' });
  const { data, error } = await supabase.from('coupons').insert(toRow(req.body)).select().single();
  if (error) return handleDbError(res, error);
  await logAuditEvent({ req, action: 'COUPON_CREATED', resource: 'COUPONS', resourceId: data.id, details: { code: data.code }, adminUser: req.adminUser });
  return res.status(201).json({ coupon: formatCoupon(data) });
});

router.put('/:id', requireAdminAuth, requirePermission('coupons:write'), validate(couponSchema), async (req, res) => {
  if (!supabase) return res.status(503).json({ message: 'Database is not configured.' });
  const { data, error } = await supabase.from('coupons').update(toRow(req.body)).eq('id', req.params.id).select().single();
  if (error) return handleDbError(res, error);
  await logAuditEvent({ req, action: 'COUPON_UPDATED', resource: 'COUPONS', resourceId: data.id, details: { code: data.code }, adminUser: req.adminUser });
  return res.json({ coupon: formatCoupon(data) });
});

router.delete('/:id', requireAdminAuth, requirePermission('coupons:write'), async (req, res) => {
  if (!supabase) return res.status(503).json({ message: 'Database is not configured.' });
  const { error } = await supabase.from('coupons').delete().eq('id', req.params.id);
  if (error) return handleDbError(res, error);
  await logAuditEvent({ req, action: 'COUPON_DELETED', resource: 'COUPONS', resourceId: req.params.id, adminUser: req.adminUser });
  return res.json({ message: 'Coupon deleted' });
});

export default router;
