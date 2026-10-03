import express from 'express';
import Product from '../models/Product.js';
import { seedProducts } from '../seed/seedData.js';

const router = express.Router();

// GET /api/products — Get all products (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { category, badge, featured, sort } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (badge) filter.badge = badge;
    if (featured === 'true') filter.featured = true;

    let query = Product.find(filter);

    if (sort === 'price_asc') query = query.sort({ price: 1 });
    else if (sort === 'price_desc') query = query.sort({ price: -1 });
    else if (sort === 'rating') query = query.sort({ rating: -1 });
    else query = query.sort({ createdAt: -1 });

    const products = await query;

    // If no products in DB, return seed data
    if (products.length === 0) {
      return res.json(seedProducts);
    }

    res.json(products);
  } catch (error) {
    // Fallback to seed data if DB is unavailable
    res.json(seedProducts);
  }
});

// GET /api/products/:slug — Get single product
router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) {
      const seedProduct = seedProducts.find((p) => p.slug === req.params.slug);
      if (seedProduct) return res.json(seedProduct);
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    const seedProduct = seedProducts.find((p) => p.slug === req.params.slug);
    if (seedProduct) return res.json(seedProduct);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/products/seed — Seed the database
router.post('/seed', async (req, res) => {
  try {
    await Product.deleteMany({});
    const created = await Product.insertMany(seedProducts);
    res.json({ message: `Seeded ${created.length} products` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
