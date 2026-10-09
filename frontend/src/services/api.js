import axios from 'axios';
import { fallbackProducts, fallbackReviews } from './fallbackData';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 8000,
});

export const getProducts = async (params = {}) => {
  try {
    const { data } = await api.get('/products', { params });
    return Array.isArray(data) ? data : data?.products || [];
  } catch {
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
    return fallbackReviews;
  }
};

export const getStoreConfig = async () => {
  const { data } = await api.get('/store/config');
  return data;
};

export const validateCoupon = async ({ code, subtotal, email }) => {
  try {
    const { data } = await api.post('/store/coupons/validate', { code, subtotal, email });
    return data;
  } catch (err) {
    return err.response?.data || { valid: false, message: 'Could not validate coupon. Please try again.' };
  }
};

export const subscribeNewsletter = async (email) => {
  try {
    const { data } = await api.post('/store/newsletter', { email });
    return data;
  } catch (err) {
    return err.response?.data || { success: false, message: 'Could not subscribe right now. Please try again.' };
  }
};

// --- Orders & checkout -----------------------------------------------------
// These go through the same VITE_API_URL-configured instance as everything
// else (previously they used raw axios with hardcoded /api paths, which broke
// in any split-origin production deploy). They intentionally do NOT fabricate
// fallback data — the caller must handle failures.

export const lookupPincode = async (pincode) => {
  const { data } = await api.get(`/orders/pincode/${pincode}`);
  return data;
};

export const createOrder = async (payload) => {
  const { data } = await api.post('/orders', payload);
  return data;
};

export const verifyPayment = async (payload) => {
  const { data } = await api.post('/orders/verify-payment', payload);
  return data;
};

export const cancelOrder = async (orderNumber, razorpayOrderId) => {
  const { data } = await api.post(`/orders/${orderNumber}/cancel`, { razorpay_order_id: razorpayOrderId });
  return data;
};

export const getOrder = async (orderNumber) => {
  const { data } = await api.get(`/orders/${orderNumber}`);
  return data;
};

export default api;
