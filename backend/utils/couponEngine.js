import supabase from '../db/supabase.js';
import { isMissingTableError } from './storeSettings.js';

export const formatCoupon = (row) => ({
  id: row.id,
  code: row.code,
  description: row.description || '',
  discountType: row.discount_type,
  discountValue: Number(row.discount_value),
  minOrderAmount: Number(row.min_order_amount || 0),
  maxDiscountAmount: row.max_discount_amount != null ? Number(row.max_discount_amount) : null,
  usageLimit: row.usage_limit,
  perCustomerLimit: row.per_customer_limit,
  usedCount: row.used_count || 0,
  startsAt: row.starts_at,
  expiresAt: row.expires_at,
  isActive: row.is_active !== false,
  createdAt: row.created_at,
});

const fail = (message) => ({ valid: false, message });

/**
 * Validates a coupon against the cart subtotal (server-computed) and,
 * when provided, the customer's prior redemptions.
 */
export const evaluateCoupon = async (rawCode, subtotal, customerEmail = null) => {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return fail('Please enter a coupon code.');
  if (!supabase) return fail('Coupons are unavailable right now.');

  const { data, error } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return fail('Coupons are not set up yet.');
    return fail('Could not validate coupon.');
  }
  if (!data) return fail('Invalid coupon code.');

  const coupon = formatCoupon(data);
  const now = Date.now();

  if (!coupon.isActive) return fail('This coupon is no longer active.');
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return fail('This coupon is not active yet.');
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return fail('This coupon has expired.');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return fail('This coupon has reached its usage limit.');
  if (subtotal < coupon.minOrderAmount) {
    return fail(`Add items worth ₹${(coupon.minOrderAmount - subtotal).toLocaleString('en-IN')} more to use this coupon.`);
  }

  if (customerEmail && coupon.perCustomerLimit != null) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_code', code)
      .eq('customer_email', customerEmail.trim().toLowerCase())
      .neq('order_status', 'cancelled');
    if ((count || 0) >= coupon.perCustomerLimit) return fail('You have already used this coupon.');
  }

  let discount =
    coupon.discountType === 'percent'
      ? Math.round((subtotal * coupon.discountValue) / 100)
      : Math.round(coupon.discountValue);
  if (coupon.maxDiscountAmount != null) discount = Math.min(discount, coupon.maxDiscountAmount);
  discount = Math.max(0, Math.min(discount, subtotal));

  const label =
    coupon.discountType === 'percent' ? `${coupon.discountValue}% off` : `₹${coupon.discountValue.toLocaleString('en-IN')} off`;

  return { valid: true, code, discount, label, coupon, message: `${code} applied — ${label}` };
};

export const redeemCoupon = async (code) => {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('redeem_coupon', { p_code: code });
  if (error) {
    console.warn('[Coupons] redeem_coupon RPC failed:', error.message);
    return false;
  }
  return data === true;
};
