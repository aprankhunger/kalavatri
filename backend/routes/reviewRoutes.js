import express from 'express';
import Review from '../models/Review.js';
import { seedReviews } from '../seed/seedData.js';

const router = express.Router();

// GET /api/reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    if (reviews.length === 0) return res.json(seedReviews);
    res.json(reviews);
  } catch (error) {
    res.json(seedReviews);
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
