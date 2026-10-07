import express from 'express';
import { z } from 'zod';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { getAllSettings, saveSetting, SETTING_KEYS } from '../../utils/storeSettings.js';

const router = express.Router();

const url = z.string().trim().max(500);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #731F26');
const text = (max) => z.string().max(max);

const SCHEMAS = {
  announcement: z.object({
    enabled: z.boolean(),
    text: text(200),
    linkLabel: text(40),
    linkUrl: url,
    backgroundColor: hex,
    textColor: hex,
    dismissible: z.boolean(),
  }),
  navigation: z.object({
    links: z.array(z.object({ label: text(40).min(1), url: url.min(1) })).max(8),
  }),
  hero: z.object({
    title: text(120),
    subtitle: text(400),
    ctaLabel: text(40),
    ctaUrl: url,
    image: url,
    stats: z.array(z.object({ value: text(20), label: text(40) })).max(4),
  }),
  footer: z.object({
    description: text(400),
    contactEmail: text(120),
    contactPhone: text(30),
    instagramUrl: url,
    facebookUrl: url,
    twitterUrl: url,
    youtubeUrl: url,
  }),
  store: z.object({
    deliveryFee: z.number().min(0).max(10000),
    freeShippingThreshold: z.number().min(0),
    dispatchNote: text(300),
    maxQuantityPerItem: z.number().int().min(1).max(100),
  }),
  homepage: z.object({
    newArrivalsTitle: text(60),
    topSellingTitle: text(60),
    categoriesTitle: text(60),
    testimonialsTitle: text(60),
    showCategories: z.boolean(),
    showTestimonials: z.boolean(),
  }),
};

router.get('/', requireAdminAuth, requirePermission('content:read'), async (req, res) => {
  return res.json(await getAllSettings());
});

router.put('/:key', requireAdminAuth, requirePermission('content:write'), async (req, res) => {
  const { key } = req.params;
  if (!SETTING_KEYS.includes(key)) return res.status(404).json({ message: 'Unknown setting' });

  const parsed = SCHEMAS[key].safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message || 'Invalid settings',
      errors: parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  try {
    const value = await saveSetting(key, parsed.data, req.adminUser?.id);
    await logAuditEvent({ req, action: 'CONTENT_UPDATED', resource: 'CONTENT', resourceId: key, details: { key }, adminUser: req.adminUser });
    return res.json({ key, value });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message, code: error.status === 409 ? 'MIGRATION_REQUIRED' : undefined });
  }
});

export default router;
