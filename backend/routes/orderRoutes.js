import express from 'express';
import supabase from '../db/supabase.js';
import { sendOrderConfirmationEmail } from '../utils/emailService.js';

const router = express.Router();

// In-memory cache for pincode lookups
const pincodeCache = new Map();

// Helper to generate readable order numbers
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `KV-${dateStr}-${randomSuffix}`;
};

// Helper to format Supabase order row into standard structure
const formatOrderResponse = (row) => {
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
    const { customer, shippingAddress, items, deliveryFee = 0, discount = 0, notes = '' } = req.body;

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

    // Calculate subtotal & total
    let calculatedSubtotal = 0;
    const orderItems = items.map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const subtotal = price * quantity;
      calculatedSubtotal += subtotal;

      return {
        name: item.name,
        image: item.image,
        price,
        quantity,
        size: item.size || null,
        color: item.color || null,
        subtotal,
      };
    });

    const totalAmount = Math.max(0, calculatedSubtotal + Number(deliveryFee) - Number(discount));
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
      delivery_fee: Number(deliveryFee),
      discount: Number(discount),
      total_amount: totalAmount,
      payment_method: 'razorpay',
      payment_status: 'pending',
      order_status: 'placed',
      notes: notes ? notes.trim() : '',
    };

    let savedOrder = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

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
