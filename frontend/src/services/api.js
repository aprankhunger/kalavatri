import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Fallback data if backend is not available
import { fallbackProducts, fallbackReviews } from './fallbackData';

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

export const getProducts = async (params = {}) => {
  try {
    const { data } = await api.get('/products', { params });
    return data;
  } catch {
    console.log('Using fallback product data');
    return fallbackProducts;
  }
};

export const getProductBySlug = async (slug) => {
  try {
    const { data } = await api.get(`/products/${slug}`);
    return data;
  } catch {
    return fallbackProducts.find((p) => p.slug === slug);
  }
};

export const getReviews = async () => {
  try {
    const { data } = await api.get('/reviews');
    return data;
  } catch {
    console.log('Using fallback review data');
    return fallbackReviews;
  }
};

export const subscribeNewsletter = async (email) => {
  // Simulate success for now
  return { success: true, message: 'Subscribed!' };
};
