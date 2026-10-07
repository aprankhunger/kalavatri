import express from 'express';
import supabase from '../db/supabase.js';
import { seedReviews } from '../seed/seedData.js';

const router = express.Router();

// GET /api/reviews
router.get('/', async (req, res) => {
  try {
    if (!supabase) return res.json(seedReviews);

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return res.json(seedReviews);
    }

    const formatted = data.map((r) => ({
      _id: r.id,
      id: r.id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      verified: r.verified,
      createdAt: r.created_at,
    }));

    return res.json(formatted);
  } catch {
    return res.json(seedReviews);
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(201).json({ id: Date.now().toString(), ...req.body });
    }

    const { name, rating, comment, productId } = req.body;
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId || null,
        name,
        rating: Number(rating),
        comment,
        verified: true,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

export default router;
