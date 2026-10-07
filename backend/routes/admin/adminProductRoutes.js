import express from 'express';
import crypto from 'crypto';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  productCreateSchema,
  productUpdateSchema,
  bulkActionSchema,
} from '../../validations/adminProductSchemas.js';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { formatProductResponse } from '../productRoutes.js';

const router = express.Router();

// Helper to generate URL-safe slugs
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Helper to generate SKU
const generateSKU = (name, category) => {
  const catPrefix = (category || 'JUT').slice(0, 3).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `KV-${catPrefix}-${rand}`;
};

// Helper to map incoming camelCase product body to Supabase snake_case columns
const mapToProductDbRow = (body) => {
  const row = {};
  if (body.name !== undefined) row.name = body.name;
  if (body.slug !== undefined) row.slug = body.slug;
  if (body.sku !== undefined) row.sku = body.sku;
  if (body.description !== undefined) row.description = body.description;
  if (body.price !== undefined) row.price = Number(body.price);
  if (body.originalPrice !== undefined) row.original_price = body.originalPrice ? Number(body.originalPrice) : null;
  if (body.discount !== undefined) row.discount = Number(body.discount || 0);
  if (body.costPrice !== undefined) row.cost_price = body.costPrice ? Number(body.costPrice) : null;
  if (body.image !== undefined) row.image = body.image;
  if (body.images !== undefined) row.images = body.images;
  if (body.category !== undefined) row.category = body.category;
  if (body.badge !== undefined) row.badge = body.badge || '';
  if (body.status !== undefined) row.status = body.status || 'published';
  if (body.rating !== undefined) row.rating = Number(body.rating || 5.0);
  if (body.reviewCount !== undefined) row.review_count = Number(body.reviewCount || 0);
  if (body.sizes !== undefined) row.sizes = body.sizes;
  if (body.colors !== undefined) row.colors = body.colors;
  if (body.stockQuantity !== undefined) row.stock_quantity = Number(body.stockQuantity || 0);
  if (body.lowStockThreshold !== undefined) row.low_stock_threshold = Number(body.lowStockThreshold || 5);
  if (body.inStock !== undefined) row.in_stock = body.inStock;
  if (body.featured !== undefined) row.featured = body.featured;
  if (body.variants !== undefined) row.variants = body.variants;
  if (body.metaTitle !== undefined) row.meta_title = body.metaTitle;
  if (body.metaDescription !== undefined) row.meta_description = body.metaDescription;
  if (body.isDeleted !== undefined) row.is_deleted = body.isDeleted;
  row.updated_at = new Date().toISOString();
  return row;
};

// GET /api/admin/products — List all products with admin controls & filters
router.get('/', requireAdminAuth, requirePermission('products:read'), async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ products: [], pagination: { total: 0, page: 1, pages: 1, limit: 20 } });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { category, status, stockFilter, search, sort } = req.query;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false);

    if (category) query = query.eq('category', category);
    if (status && status !== 'all') query = query.eq('status', status);

    if (stockFilter === 'low') {
      query = query.filter('stock_quantity', 'lte', 5);
    } else if (stockFilter === 'out_of_stock') {
      query = query.filter('stock_quantity', 'lte', 0);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price', { ascending: false });
    else if (sort === 'stock_desc') query = query.order('stock_quantity', { ascending: false });
    else if (sort === 'rating') query = query.order('rating', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    query = query.range(skip, skip + limit - 1);

    const { data, count, error } = await query;

    if (error) throw new Error(error.message);

    const products = (data || []).map(formatProductResponse);
    const total = count || 0;

    return res.json({
      products,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/admin/products/:id — Get full details for edit form
router.get('/:id', requireAdminAuth, requirePermission('products:read'), async (req, res) => {
  try {
    if (!supabase) return res.status(404).json({ error: 'Database unavailable' });

    const { data: productRow, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_deleted', false)
      .single();

    if (error || !productRow) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return res.json({
      product: formatProductResponse(productRow),
      movements: movements || [],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/admin/products — Create a new product
router.post('/', requireAdminAuth, requirePermission('products:write'), validate(productCreateSchema), async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    const data = { ...req.body };

    // Auto-generate slug and SKU if missing
    if (!data.slug) {
      let baseSlug = generateSlug(data.name);
      let uniqueSlug = baseSlug;
      let counter = 1;

      while (true) {
        const { data: existing } = await supabase.from('products').select('id').eq('slug', uniqueSlug).single();
        if (!existing) break;
        uniqueSlug = `${baseSlug}-${counter++}`;
      }
      data.slug = uniqueSlug;
    }

    if (!data.sku) {
      data.sku = generateSKU(data.name, data.category);
    }

    // Auto-generate variants from sizes if not provided
    if ((!data.variants || data.variants.length === 0) && data.sizes && data.sizes.length > 0) {
      const perSizeStock = Math.floor((data.stockQuantity || 0) / data.sizes.length);
      data.variants = data.sizes.map((size) => ({
        sku: `${data.sku}-S${size}`,
        size,
        color: data.colors?.[0] || '',
        price: data.price,
        stockQuantity: perSizeStock,
        inStock: perSizeStock > 0,
      }));
    }

    const rowToInsert = mapToProductDbRow(data);
    const { data: createdProduct, error } = await supabase
      .from('products')
      .insert(rowToInsert)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Record initial inventory movement
    if (createdProduct.stock_quantity > 0) {
      await supabase.from('inventory_movements').insert({
        product_id: createdProduct.id,
        type: 'initial',
        quantity_delta: createdProduct.stock_quantity,
        previous_stock: 0,
        new_stock: createdProduct.stock_quantity,
        reason: 'Initial product creation',
        performed_by: req.adminUser.id,
      });
    }

    await logAuditEvent({
      req,
      action: 'PRODUCT_CREATED',
      resource: 'PRODUCTS',
      resourceId: createdProduct.id,
      details: { name: createdProduct.name, sku: createdProduct.sku, price: createdProduct.price },
      adminUser: req.adminUser,
    });

    return res.status(201).json({
      message: 'Product created successfully',
      product: formatProductResponse(createdProduct),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/admin/products/:id — Update product details
router.put('/:id', requireAdminAuth, requirePermission('products:write'), validate(productUpdateSchema), async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    const { data: existing, error: getErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_deleted', false)
      .single();

    if (getErr || !existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const oldStock = Number(existing.stock_quantity);
    const updateRow = mapToProductDbRow(req.body);

    const { data: updatedProduct, error: updateErr } = await supabase
      .from('products')
      .update(updateRow)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // Record inventory movement if stock changed
    if (req.body.stockQuantity !== undefined && Number(req.body.stockQuantity) !== oldStock) {
      const diff = Number(req.body.stockQuantity) - oldStock;
      await supabase.from('inventory_movements').insert({
        product_id: updatedProduct.id,
        type: diff > 0 ? 'restock' : 'adjustment',
        quantity_delta: diff,
        previous_stock: oldStock,
        new_stock: Number(req.body.stockQuantity),
        reason: 'Product form update',
        performed_by: req.adminUser.id,
      });
    }

    await logAuditEvent({
      req,
      action: 'PRODUCT_UPDATED',
      resource: 'PRODUCTS',
      resourceId: updatedProduct.id,
      details: { name: updatedProduct.name, sku: updatedProduct.sku },
      adminUser: req.adminUser,
    });

    return res.json({
      message: 'Product updated successfully',
      product: formatProductResponse(updatedProduct),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// DELETE /api/admin/products/:id — Soft-delete product
router.delete('/:id', requireAdminAuth, requirePermission('products:write'), async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    const { data: product, error } = await supabase
      .from('products')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await logAuditEvent({
      req,
      action: 'PRODUCT_DELETED',
      resource: 'PRODUCTS',
      resourceId: product.id,
      details: { name: product.name, sku: product.sku },
      adminUser: req.adminUser,
    });

    return res.json({ message: 'Product deleted successfully', id: product.id });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/admin/products/bulk — Bulk actions
router.post('/bulk', requireAdminAuth, requirePermission('products:write'), validate(bulkActionSchema), async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    const { action, ids, data } = req.body;
    let updates = { updated_at: new Date().toISOString() };

    if (action === 'publish') updates.status = 'published';
    else if (action === 'draft') updates.status = 'draft';
    else if (action === 'delete') updates.is_deleted = true;
    else if (action === 'price_update' && data?.price) updates.price = Number(data.price);
    else if (action === 'stock_update' && data?.stockQuantity !== undefined) updates.stock_quantity = Number(data.stockQuantity);

    const { error } = await supabase
      .from('products')
      .update(updates)
      .in('id', ids);

    if (error) throw new Error(error.message);

    await logAuditEvent({
      req,
      action: `BULK_${action.toUpperCase()}`,
      resource: 'PRODUCTS',
      details: { count: ids.length, action, ids },
      adminUser: req.adminUser,
    });

    return res.json({ message: `Bulk action '${action}' applied to ${ids.length} products.` });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
