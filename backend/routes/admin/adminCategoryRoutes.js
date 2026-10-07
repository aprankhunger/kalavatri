import express from 'express';
import { z } from 'zod';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { formatCategory, getCategories, isMissingTableError } from '../../utils/storeSettings.js';

const router = express.Router();

const slugify = (v) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(60).optional().default(''),
  description: z.string().max(300).optional().default(''),
  image: z.string().max(500).optional().default(''),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  showOnHome: z.boolean().optional().default(true),
});

const toRow = (c) => ({
  name: c.name,
  slug: slugify(c.slug || c.name),
  description: c.description,
  image: c.image,
  sort_order: c.sortOrder,
  is_active: c.isActive,
  show_on_home: c.showOnHome,
  updated_at: new Date().toISOString(),
});

const handleDbError = (res, error) => {
  if (isMissingTableError(error)) {
    return res.status(409).json({ message: 'Categories table missing. Run the database migration from Store Settings → Database.', code: 'MIGRATION_REQUIRED' });
  }
  if (error.code === '23505') return res.status(409).json({ message: 'A category with this slug already exists.' });
  return res.status(500).json({ message: error.message });
};

router.get('/', requireAdminAuth, requirePermission('products:read'), async (req, res) => {
  const categories = await getCategories({ includeInactive: true });
  let counts = {};
  if (supabase) {
    const { data } = await supabase.from('products').select('category').eq('is_deleted', false);
    counts = (data || []).reduce((acc, p) => ({ ...acc, [p.category]: (acc[p.category] || 0) + 1 }), {});
  }
  return res.json({ categories: categories.map((c) => ({ ...c, productCount: counts[c.slug] || 0 })) });
});

router.post('/', requireAdminAuth, requirePermission('products:write'), validate(categorySchema), async (req, res) => {
  if (!supabase) return res.status(503).json({ message: 'Database is not configured.' });
  const { data, error } = await supabase.from('categories').insert(toRow(req.body)).select().single();
  if (error) return handleDbError(res, error);
  await logAuditEvent({ req, action: 'CATEGORY_CREATED', resource: 'CATEGORIES', resourceId: data.id, details: { name: data.name }, adminUser: req.adminUser });
  return res.status(201).json({ category: formatCategory(data) });
});

router.put('/:id', requireAdminAuth, requirePermission('products:write'), validate(categorySchema), async (req, res) => {
  if (!supabase) return res.status(503).json({ message: 'Database is not configured.' });
  const { data: before } = await supabase.from('categories').select('slug').eq('id', req.params.id).maybeSingle();
  const row = toRow(req.body);
  const { data, error } = await supabase.from('categories').update(row).eq('id', req.params.id).select().single();
  if (error) return handleDbError(res, error);

  // Keep products attached when the slug changes
  if (before?.slug && before.slug !== row.slug) {
    await supabase.from('products').update({ category: row.slug }).eq('category', before.slug);
  }
  await logAuditEvent({ req, action: 'CATEGORY_UPDATED', resource: 'CATEGORIES', resourceId: data.id, details: { name: data.name }, adminUser: req.adminUser });
  return res.json({ category: formatCategory(data) });
});

router.delete('/:id', requireAdminAuth, requirePermission('products:write'), async (req, res) => {
  if (!supabase) return res.status(503).json({ message: 'Database is not configured.' });
  const { data: cat } = await supabase.from('categories').select('slug').eq('id', req.params.id).maybeSingle();
  if (!cat) return res.status(404).json({ message: 'Category not found' });

  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('category', cat.slug).eq('is_deleted', false);
  if (count > 0) {
    return res.status(409).json({ message: `Move or delete the ${count} product(s) in this category first, or hide it instead.` });
  }
  const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
  if (error) return handleDbError(res, error);
  await logAuditEvent({ req, action: 'CATEGORY_DELETED', resource: 'CATEGORIES', resourceId: req.params.id, adminUser: req.adminUser });
  return res.json({ message: 'Category deleted' });
});

export default router;
