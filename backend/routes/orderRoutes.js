import express from 'express';
import crypto from 'crypto';
import supabase from '../db/supabase.js';
import razorpay, { razorpayKeyId } from '../utils/razorpay.js';
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
    const entry = { key: String(p.id || p._id || p.slug), id: p.id || p._id, slug: p.slug, name: p.name, image: p.image, price: Number(p.price), stock: p.stock_quantity != null ? Number(p.stock_quantity) : null };
    catalogue.set(String(entry.id), entry);
    if (entry.slug) catalogue.set(String(entry.slug), entry);
  };

  if (supabase) {
    const ids = [...new Set(items.map((i) => String(i._id || i.id || '')).filter((id) => UUID_RE.test(id)))];
    const slugs = [...new Set(items.map((i) => i.slug).filter(Boolean))];
    if (ids.length) {
      const { data } = await supabase.from('products').select('id, slug, name, image, price, status, is_deleted, stock_quantity').in('id', ids);
      (data || []).filter((p) => !p.is_deleted && p.status === 'published').forEach(add);
    }
    if (slugs.length) {
      const { data } = await supabase.from('products').select('id, slug, name, image, price, status, is_deleted, stock_quantity').in('slug', slugs);
      (data || []).filter((p) => !p.is_deleted && p.status === 'published').forEach(add);
    }
    // When a DB is configured we return exactly what it holds — never mix in
    // demo/seed products (they aren't real inventory and must not be orderable).
    return catalogue;
  }

  // Dev-only: no database configured → fall back to the bundled seed catalogue
  seedProducts.filter((p) => (!p.status || p.status === 'published') && !p.isDeleted).forEach(add);
  return catalogue;
};

// In-memory cache for pincode lookups
const pincodeCache = new Map();

// Pulls the next short, sequential order number from the DB (e.g. "KV-10001").
// Postgres owns the counter, so the value is guaranteed unique even under
// concurrent checkouts — short enough to read aloud for dispatch, with no
// collision retry needed. See migration 004_order_number_sequence.sql.
const nextOrderNumber = async () => {
  if (supabase) {
    const { data, error } = await supabase.rpc('next_order_number');
    if (!error && data) return data;
    if (/Could not find the function|does not exist|schema cache/i.test(error?.message || '')) {
      console.error('[Orders] next_order_number RPC missing — run migration 004_order_number_sequence.sql');
    } else {
      console.error('[Orders] next_order_number RPC failed, using local fallback:', error?.message);
    }
  }
  // Offline/dev or RPC not yet migrated → local fallback (not sequential).
  return `KV-${Math.floor(10000 + Math.random() * 90000)}`;
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

// Marks a (previously reserved) order as paid, redeems its coupon, and fires
// the confirmation email. Shared by the zero-amount path and payment verify.
const finalizePaidOrder = async (orderRow, { method = 'razorpay', paymentId = null, signature = null } = {}) => {
  if (!supabase) return formatOrderResponse(orderRow);

  const wasCancelled = orderRow.order_status === 'cancelled';
  if (wasCancelled) {
    // Rare: order was released then still paid. Honor the payment and flag it.
    console.warn(`[Orders] Order ${orderRow.order_number} was cancelled but paid — stock may need reconciliation.`);
  }

  const updates = {
    payment_status: 'paid',
    payment_method: method,
    order_status: wasCancelled ? 'placed' : orderRow.order_status || 'placed',
  };
  if (paymentId) updates.razorpay_payment_id = paymentId;
  if (signature) updates.razorpay_signature = signature;

  const { data: updated } = await supabase.from('orders').update(updates).eq('id', orderRow.id).select().single();
  const finalRow = updated || { ...orderRow, ...updates };

  // Redeem the coupon now (deferred from order creation). Non-fatal on failure.
  if (finalRow.coupon_code) {
    const ok = await redeemCoupon(finalRow.coupon_code);
    if (!ok) console.warn(`[Orders] Coupon ${finalRow.coupon_code} could not be redeemed at payment time.`);
  }

  const formatted = formatOrderResponse(finalRow);
  sendOrderConfirmationEmail(formatted).catch((err) => {
    console.error('[Email Warning] Asynchronous email dispatch error:', err.message);
  });
  return formatted;
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

    // Validate coupon and compute the discount server-side. Redemption is
    // DEFERRED to successful payment (see finalizePaidOrder) so an abandoned
    // or failed checkout never burns a coupon's usage count.
    let serverDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const result = await evaluateCoupon(couponCode, calculatedSubtotal, customer.email);
      if (!result.valid) {
        return res.status(422).json({ success: false, message: result.message });
      }
      serverDiscount = result.discount;
      appliedCoupon = result.code;
    }

    const totalAmount = Math.max(0, calculatedSubtotal + serverDeliveryFee - serverDiscount);
    const orderNumber = await nextOrderNumber();

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

    // Offline/dev fallback: no DB → return a local stub (no real payment).
    if (!supabase) {
      const savedOrder = formatOrderResponse({
        id: 'local-' + Date.now(),
        ...orderPayload,
        payment_status: 'paid',
        created_at: new Date().toISOString(),
      });
      return res.status(201).json({ success: true, message: 'Order created (offline mode)', order: savedOrder, razorpay: null });
    }

    // 1. Reserve stock atomically BEFORE taking payment — never collect money
    //    for an item we can't fulfil. A shortage on any line rolls back all.
    const { error: reserveError } = await supabase.rpc('reserve_order_stock', {
      p_items: orderItems,
      p_order_ref: orderNumber,
    });
    if (reserveError) {
      const msg = reserveError.message || '';
      if (/INSUFFICIENT_STOCK:/.test(msg)) {
        const name = msg.split('INSUFFICIENT_STOCK:')[1]?.trim() || 'an item';
        return res.status(409).json({ success: false, message: `Sorry, "${name}" doesn't have enough stock left.` });
      }
      if (/UNAVAILABLE:/.test(msg)) {
        const name = msg.split('UNAVAILABLE:')[1]?.trim() || 'an item';
        return res.status(409).json({ success: false, message: `"${name}" is no longer available.` });
      }
      if (/Could not find the function|does not exist|schema cache/i.test(msg)) {
        console.error('[Orders] reserve_order_stock RPC missing — run migration 003_order_payment_stock.sql');
      } else {
        console.error('[Orders] Stock reservation failed:', msg);
      }
      return res.status(500).json({ success: false, message: 'Checkout is temporarily unavailable. Please try again shortly.' });
    }
    // 2. Persist the pending order (release stock if the insert fails).
    const insertPayload = appliedCoupon ? { ...orderPayload, coupon_code: appliedCoupon } : orderPayload;
    let { data: orderRow, error: insertError } = await supabase.from('orders').insert(insertPayload).select().single();
    if (insertError && appliedCoupon && /coupon_code/.test(insertError.message)) {
      ({ data: orderRow, error: insertError } = await supabase.from('orders').insert(orderPayload).select().single());
    }
    if (insertError || !orderRow) {
      await supabase.rpc('release_order_stock', { p_items: orderItems, p_order_ref: orderNumber }).then(() => {}, () => {});
      throw new Error(insertError?.message || 'Order could not be created.');
    }

    // 3. Zero-amount orders (e.g. a 100% coupon) need no payment step.
    if (totalAmount <= 0) {
      const finalized = await finalizePaidOrder(orderRow, { method: 'free' });
      return res.status(201).json({ success: true, message: 'Order confirmed', order: finalized, razorpay: null });
    }

    // 4. No gateway configured → leave order pending, tell the client.
    if (!razorpay) {
      return res.status(201).json({
        success: true,
        message: 'Order created, but online payment is not configured.',
        order: formatOrderResponse(orderRow),
        razorpay: null,
      });
    }

    // 5. Create the Razorpay order the browser will pay against.
    try {
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // paise
        currency: 'INR',
        receipt: orderNumber,
        notes: { orderNumber },
      });
      await supabase.from('orders').update({ razorpay_order_id: rzpOrder.id }).eq('id', orderRow.id);
      orderRow.razorpay_order_id = rzpOrder.id;

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: formatOrderResponse(orderRow),
        razorpay: { keyId: razorpayKeyId, orderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency },
      });
    } catch (payErr) {
      await supabase.rpc('release_order_stock', { p_items: orderItems, p_order_ref: orderNumber }).then(() => {}, () => {});
      await supabase.from('orders').update({ payment_status: 'failed', order_status: 'cancelled' }).eq('id', orderRow.id);
      console.error('[Orders] Razorpay order creation failed:', payErr.message);
      return res.status(502).json({ success: false, message: 'Could not start the payment. Please try again.' });
    }
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

// POST /api/orders/verify-payment — Confirm a Razorpay payment & finalize order
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!orderNumber || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
    }
    if (!supabase) return res.status(503).json({ success: false, message: 'Database not configured.' });
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ success: false, message: 'Payment gateway not configured.' });
    }

    const { data: orderRow, error } = await supabase.from('orders').select('*').eq('order_number', orderNumber).single();
    if (error || !orderRow) return res.status(404).json({ success: false, message: 'Order not found.' });

    // Payment must correspond to the Razorpay order we created for this order.
    if (orderRow.razorpay_order_id && orderRow.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Payment does not match this order.' });
    }

    // Idempotent: already finalized.
    if (orderRow.payment_status === 'paid') {
      return res.json({ success: true, message: 'Payment already verified.', order: formatOrderResponse(orderRow) });
    }

    // Verify the HMAC-SHA256 signature (constant-time compare).
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const sigBuf = Buffer.from(razorpay_signature, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    if (!valid) {
      await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', orderRow.id);
      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    const finalized = await finalizePaidOrder(orderRow, {
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    return res.json({ success: true, message: 'Payment verified successfully.', order: finalized });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Payment verification error.', error: err.message });
  }
});

// POST /api/orders/:orderNumber/cancel — Release a pending (unpaid) order's
// reserved stock. Requires the razorpay_order_id as a capability token so a
// stranger can't release stock by guessing order numbers.
router.post('/:orderNumber/cancel', async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true });
    const { orderNumber } = req.params;
    const { razorpay_order_id } = req.body || {};

    const { data: orderRow } = await supabase.from('orders').select('*').eq('order_number', orderNumber).single();
    if (!orderRow) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (orderRow.payment_status === 'paid') {
      return res.status(409).json({ success: false, message: 'Order is already paid.' });
    }
    if (!orderRow.razorpay_order_id || orderRow.razorpay_order_id !== razorpay_order_id) {
      return res.status(403).json({ success: false, message: 'Not allowed to cancel this order.' });
    }

    if (orderRow.order_status !== 'cancelled') {
      await supabase.rpc('release_order_stock', { p_items: orderRow.items || [], p_order_ref: orderNumber }).then(() => {}, () => {});
      await supabase.from('orders').update({ payment_status: 'failed', order_status: 'cancelled' }).eq('id', orderRow.id);
    }
    return res.json({ success: true, message: 'Order cancelled and stock released.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not cancel order.', error: err.message });
  }
});

export default router;
