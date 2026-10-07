import express from 'express';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { stockAdjustSchema } from '../../validations/adminProductSchemas.js';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { formatProductResponse } from '../productRoutes.js';
import { seedProducts } from '../../seed/seedData.js';

const router = express.Router();

// GET /api/admin/inventory/summary — Total units, valuation, low stock & out of stock alerts
router.get('/summary', requireAdminAuth, requirePermission('products:read'), async (req, res) => {
  try {
    let activeProducts = [];

    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false);

      if (!error && data && data.length > 0) {
        activeProducts = data.map(formatProductResponse);
      }
    }

    if (activeProducts.length === 0) {
      activeProducts = seedProducts;
    }

    let totalUnits = 0;
    let totalValuation = 0;
    const lowStockItems = [];
    const outOfStockItems = [];

    activeProducts.forEach((p) => {
      const stock = p.stockQuantity || 0;
      const cost = p.costPrice || p.price * 0.45;
      totalUnits += stock;
      totalValuation += stock * cost;

      if (stock === 0) {
        outOfStockItems.push({
          id: p._id || p.id,
          name: p.name,
          sku: p.sku,
          image: p.image,
          stock: 0,
        });
      } else if (stock <= (p.lowStockThreshold || 5)) {
        lowStockItems.push({
          id: p._id || p.id,
          name: p.name,
          sku: p.sku,
          image: p.image,
          stock,
          threshold: p.lowStockThreshold || 5,
        });
      }
    });

    return res.json({
      totalProducts: activeProducts.length,
      totalUnits,
      totalValuation: Math.round(totalValuation),
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems,
      outOfStockItems,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/admin/inventory/adjust — Adjust stock quantity with reason and audit trail
router.post('/adjust', requireAdminAuth, requirePermission('products:stock_update'), validate(stockAdjustSchema), async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    const { productId, variantSku, quantityChange, reason } = req.body;

    const { data: productRow, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_deleted', false)
      .single();

    if (prodErr || !productRow) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = Number(productRow.stock_quantity || 0);
    let newStock = previousStock + Number(quantityChange);
    if (newStock < 0) newStock = 0; // Prevent negative inventory

    const variants = productRow.variants || [];
    if (variantSku && variants.length > 0) {
      const variant = variants.find((v) => v.sku === variantSku);
      if (variant) {
        variant.stockQuantity = Math.max(0, (variant.stockQuantity || 0) + Number(quantityChange));
        variant.inStock = variant.stockQuantity > 0;
      }
    }

    const { data: updatedProduct, error: updateErr } = await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
        in_stock: newStock > 0,
        variants,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // Record immutable inventory movement in Supabase
    const { data: movement } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: productId,
        type: quantityChange >= 0 ? 'restock' : 'adjustment',
        quantity_delta: Number(quantityChange),
        previous_stock: previousStock,
        new_stock: newStock,
        reason,
        performed_by: req.adminUser.id,
      })
      .select()
      .single();

    await logAuditEvent({
      req,
      action: 'STOCK_ADJUSTED',
      resource: 'INVENTORY',
      resourceId: productId,
      details: {
        productName: productRow.name,
        sku: productRow.sku,
        variantSku,
        quantityChange,
        previousStock,
        newStock,
        reason,
      },
      adminUser: req.adminUser,
    });

    return res.json({
      message: 'Stock adjusted successfully',
      product: formatProductResponse(updatedProduct),
      movement,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/admin/inventory/movements — Stock movement history log
router.get('/movements', requireAdminAuth, requirePermission('products:read'), async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ movements: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { productId, type } = req.query;

    let query = supabase
      .from('inventory_movements')
      .select('*, products(name, sku)', { count: 'exact' });

    if (productId) query = query.eq('product_id', productId);
    if (type) query = query.eq('type', type);

    query = query.order('created_at', { ascending: false }).range(skip, skip + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const total = count || 0;
    return res.json({
      movements: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
