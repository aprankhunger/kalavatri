import express from 'express';
import rateLimit from 'express-rate-limit';
import supabase from '../db/supabase.js';
import { getAllSettings, getCategories, isMissingTableError } from '../utils/storeSettings.js';
import { evaluateCoupon } from '../utils/couponEngine.js';

const router = express.Router();

const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

// GET /api/store/config — everything the storefront needs to render its chrome
router.get('/config', async (req, res) => {
  try {
    const [settings, categories] = await Promise.all([getAllSettings(), getCategories()]);
    res.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
    return res.json({ ...settings, categories });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/categories', async (req, res) => {
  const categories = await getCategories();
  return res.json(categories);
});

// POST /api/store/coupons/validate — preview a coupon against a subtotal
router.post('/coupons/validate', publicFormLimiter, async (req, res) => {
  const { code, subtotal, email } = req.body || {};
  const numericSubtotal = Number(subtotal);
  if (!Number.isFinite(numericSubtotal) || numericSubtotal < 0) {
    return res.status(400).json({ valid: false, message: 'Invalid cart total.' });
  }
  const result = await evaluateCoupon(code, numericSubtotal, email || null);
  const { coupon, ...publicResult } = result;
  return res.status(result.valid ? 200 : 422).json(publicResult);
});

// POST /api/store/newsletter — subscribe an email
router.post('/newsletter', publicFormLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (!supabase) return res.json({ success: true, message: 'Thanks for subscribing!' });

  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert({ email, is_active: true }, { onConflict: 'email' });

  if (error && !isMissingTableError(error)) {
    return res.status(500).json({ success: false, message: 'Could not subscribe right now. Please try again.' });
  }
  return res.json({ success: true, message: 'Thanks for subscribing! Watch your inbox for offers.' });
});

export default router;
