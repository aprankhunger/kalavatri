import express from 'express';
import supabase from '../db/supabase.js';
import { sendOrderConfirmationEmail } from '../utils/emailService.js';
import { getSetting } from '../utils/storeSettings.js';
import { evaluateCoupon, redeemCoupon } from '../utils/couponEngine.js';
import { seedProducts } from '../seed/seedData.js';

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns a Map keyed by both id and slug → { key, id, slug, name, image, price }
const loadCatalogue = async (items) => {
  const catalogue = new Map();
  const add = (p) => {
    const entry = { key: String(p.id || p._id || p.slug), id: p.id || p._id, slug: p.slug, name: p.name, image: p.image, price: Number(p.price) };
    catalogue.set(String(entry.id), entry);
    if (entry.slug) catalogue.set(String(entry.slug), entry);
  };

  if (supabase) {
    const ids = [...new Set(items.map((i) => String(i._id || i.id || '')).filter((id) => UUID_RE.test(id)))];
    const slugs = [...new Set(items.map((i) => i.slug).filter(Boolean))];
    if (ids.length) {
      const { data } = await supabase.from('products').select('id, slug, name, image, price, status, is_deleted').in('id', ids);
      (data || []).filter((p) => !p.is_deleted && p.status === 'published').forEach(add);
    }
    if (slugs.length) {
      const { data } = await supabase.from('products').select('id, slug, name, image, price, status, is_deleted').in('slug', slugs);
      (data || []).filter((p) => !p.is_deleted && p.status === 'published').forEach(add);
    }
    if (catalogue.size > 0) return catalogue;
  }

  // Storefront falls back to seed data when the DB has no products
  seedProducts.filter((p) => (!p.status || p.status === 'published') && !p.isDeleted).forEach(add);
  return catalogue;
};

// In-memory cache for pincode lookups
const pincodeCache = new Map();

// Helper to generate readable order numbers
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `KV-${dateStr}-${randomSuffix}`;
};

// Helper to format Supabase order row into standard structure
export const formatOrderResponse = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    orderNumber: row.order_number,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    shippingAddress: {
      addressLine1: row.shipping_address_line1,
      addressLine2: row.shipping_address_line2,
      landmark: row.landmark,
      pincode: row.pincode,
      city: row.city,
      state: row.state,
      country: row.country || 'India',
    },
    items: row.items || [],
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee || 0),
    discount: Number(row.discount || 0),
    couponCode: row.coupon_code || null,
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method || 'razorpay',
    paymentStatus: row.payment_status || 'pending',
    orderStatus: row.order_status || 'placed',
    trackingNumber: row.tracking_number,
    courierName: row.courier_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// GET /api/orders/pincode/:pincode — Lookup City & State by Indian Postal PIN code
router.get('/pincode/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;
    const cleanPincode = pincode ? pincode.trim() : '';

    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 6-digit Indian PIN code',
      });
    }

    if (pincodeCache.has(cleanPincode)) {
      return res.json({
        success: true,
        ...pincodeCache.get(cleanPincode),
        cached: true,
      });
    }

    // Query official postal API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPincode}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Postal API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const office = data[0].PostOffice[0];
      const result = {
        city: office.District || office.Block || office.Division || '',
        state: office.State || '',
        area: office.Name || '',
      };

      pincodeCache.set(cleanPincode, result);
      return res.json({ success: true, ...result });
    }

    return res.status(404).json({
      success: false,
      message: 'PIN code not found in postal database. You can enter your City and State manually.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not auto-fetch PIN code details. Please type City and State manually.',
      error: error.message,
    });
  }
});

// POST /api/orders — Create Guest Checkout Order
router.post('/', async (req, res) => {
  try {
    const { customer, shippingAddress, items, couponCode = '', notes = '' } = req.body;

    // Validate customer contact
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone number are required.',
      });
    }

    // Validate phone (10 digits)
    const phoneDigits = customer.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile phone number.',
      });
    }

    // Validate shipping address
    if (!shippingAddress?.addressLine1 || !shippingAddress?.pincode || !shippingAddress?.city || !shippingAddress?.state) {
      return res.status(400).json({
        success: false,
        message: 'Address line 1, PIN code, city, and state are required.',
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please add items before checking out.',
      });
    }

    if (items.length > 30) {
      return res.status(400).json({ success: false, message: 'Too many items in a single order.' });
    }

    const storeRules = await getSetting('store');
    const maxQty = Math.max(1, Number(storeRules.maxQuantityPerItem) || 10);

    // Re-price every line from the catalogue — never trust client prices
    const catalogue = await loadCatalogue(items);
    const quantityByProduct = new Map();
    let calculatedSubtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = catalogue.get(String(item._id || item.id)) || catalogue.get(String(item.slug));
      if (!product) {
        return res.status(400).json({ success: false, message: `"${item.name || 'An item'}" is no longer available.` });
      }
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, message: 'Invalid item quantity.' });
      }
      const aggregate = (quantityByProduct.get(product.key) || 0) + quantity;
      if (aggregate > maxQty) {
        return res.status(400).json({ success: false, message: `You can order at most ${maxQty} pairs of "${product.name}".` });
      }
      quantityByProduct.set(product.key, aggregate);

      const lineTotal = product.price * quantity;
      calculatedSubtotal += lineTotal;
      orderItems.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity,
        size: item.size || null,
        color: item.color || null,
        subtotal: lineTotal,
      });
    }

    const threshold = Number(storeRules.freeShippingThreshold) || 0;
    const serverDeliveryFee =
      threshold > 0 && calculatedSubtotal >= threshold ? 0 : Math.max(0, Number(storeRules.deliveryFee) || 0);

    let serverDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const result = await evaluateCoupon(couponCode, calculatedSubtotal, customer.email);
      if (!result.valid) {
        return res.status(422).json({ success: false, message: result.message });
      }
      const redeemed = await redeemCoupon(result.code);
      if (!redeemed) {
        return res.status(422).json({ success: false, message: 'This coupon has just reached its usage limit.' });
      }
      serverDiscount = result.discount;
      appliedCoupon = result.code;
    }

    const totalAmount = Math.max(0, calculatedSubtotal + serverDeliveryFee - serverDiscount);
    const orderNumber = generateOrderNumber();

    const orderPayload = {
      order_number: orderNumber,
      customer_name: customer.name.trim(),
      customer_email: customer.email.trim().toLowerCase(),
      customer_phone: phoneDigits,
      shipping_address_line1: shippingAddress.addressLine1.trim(),
      shipping_address_line2: shippingAddress.addressLine2 ? shippingAddress.addressLine2.trim() : '',
      landmark: shippingAddress.landmark ? shippingAddress.landmark.trim() : '',
      pincode: shippingAddress.pincode.trim(),
      city: shippingAddress.city.trim(),
      state: shippingAddress.state.trim(),
      country: 'India',
      items: orderItems,
      subtotal: calculatedSubtotal,
      delivery_fee: serverDeliveryFee,
      discount: serverDiscount,
      total_amount: totalAmount,
      payment_method: 'razorpay',
      payment_status: 'pending',
      order_status: 'placed',
      notes: notes ? notes.trim() : '',
    };

    let savedOrder = null;

    if (supabase) {
      let { data, error } = await supabase
        .from('orders')
        .insert(appliedCoupon ? { ...orderPayload, coupon_code: appliedCoupon } : orderPayload)
        .select()
        .single();

      if (error && appliedCoupon && /coupon_code/.test(error.message)) {
        ({ data, error } = await supabase.from('orders').insert(orderPayload).select().single());
      }

      if (error) {
        throw new Error(error.message);
      }
      savedOrder = formatOrderResponse(data);
    } else {
      // Offline fallback stub
      savedOrder = formatOrderResponse({
        id: 'local-' + Date.now(),
        ...orderPayload,
        created_at: new Date().toISOString(),
      });
    }

    // Trigger automated order confirmation email asynchronously
    sendOrderConfirmationEmail(savedOrder).catch((err) => {
      console.error('[Email Warning] Asynchronous email dispatch error:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: savedOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process order',
      error: error.message,
    });
  }
});

// GET /api/orders/:orderNumber — Retrieve order confirmation
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    if (!supabase) {
      return res.json({
        success: true,
        order: {
          orderNumber,
          customer: { name: 'Customer', email: 'customer@example.com' },
          shippingAddress: { city: 'Delhi', state: 'Delhi', pincode: '110001' },
          totalAmount: 0,
        },
      });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({
      success: true,
      order: formatOrderResponse(data),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message,
    });
  }
});

export default router;
