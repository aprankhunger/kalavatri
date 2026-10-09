import express from 'express';
import supabase from '../db/supabase.js';
import { seedProducts } from '../seed/seedData.js';

const router = express.Router();

// Helper to format Supabase snake_case product to frontend camelCase
export const formatProductResponse = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.description,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : null,
    discount: Number(row.discount || 0),
    image: row.image,
    images: row.images || [row.image],
    category: row.category,
    badge: row.badge || '',
    status: row.status || 'published',
    rating: Number(row.rating || 5.0),
    reviewCount: row.review_count || 0,
    sizes: row.sizes || [],
    colors: row.colors || [],
    stockQuantity: row.stock_quantity || 0,
    lowStockThreshold: row.low_stock_threshold || 5,
    inStock: row.in_stock !== false,
    featured: row.featured || false,
    variants: row.variants || [],
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Public: Helper to filter seed products safely (hide cost price and drafts)
const getPublicSeedProducts = () => {
  return seedProducts
    .filter((p) => p.status === 'published' && !p.isDeleted)
    .map(({ costPrice, ...publicData }) => publicData);
};

// GET /api/products — Get all active published products for customer storefront
router.get('/', async (req, res) => {
  try {
    // Seed data is a DEV-ONLY fallback for when no database is configured.
    // When Supabase is connected we return real data (even if empty) and never
    // substitute demo products — serving fake, orderable items in production
    // would let customers "buy" products that don't exist.
    if (!supabase) {
      return res.json(getPublicSeedProducts());
    }

    const { category, badge, featured, sort } = req.query;

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .eq('status', 'published');

    if (category) query = query.eq('category', category);
    if (badge) query = query.eq('badge', badge);
    if (featured === 'true') query = query.eq('featured', true);

    if (sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price', { ascending: false });
    else if (sort === 'rating') query = query.order('rating', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[Products] Query failed:', error.message);
      return res.status(502).json({ message: 'Unable to load products right now. Please try again shortly.' });
    }

    return res.json((data || []).map(formatProductResponse));
  } catch (error) {
    console.error('[Products] Unexpected error:', error.message);
    return res.status(500).json({ message: 'Unable to load products right now. Please try again shortly.' });
  }
});

// GET /api/products/:slug — Get single product by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    if (!supabase) {
      const seedProduct = getPublicSeedProducts().find((p) => p.slug === req.params.slug);
      if (seedProduct) return res.json(seedProduct);
      return res.status(404).json({ message: 'Product not found' });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('is_deleted', false)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      console.error('[Products] Detail query failed:', error.message);
      return res.status(502).json({ message: 'Unable to load this product right now. Please try again shortly.' });
    }

    if (!data) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(formatProductResponse(data));
  } catch (error) {
    console.error('[Products] Detail unexpected error:', error.message);
    return res.status(500).json({ message: 'Unable to load this product right now. Please try again shortly.' });
  }
});

export default router;
