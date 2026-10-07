import express from 'express';
import Order from '../models/Order.js';
import { sendOrderConfirmationEmail } from '../utils/emailService.js';

const router = express.Router();

// In-memory cache for pincode lookups
const pincodeCache = new Map();

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
    const orderNumber = Order.generateOrderNumber();

    const newOrder = new Order({
      orderNumber,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: phoneDigits,
      },
      shippingAddress: {
        addressLine1: shippingAddress.addressLine1.trim(),
        addressLine2: shippingAddress.addressLine2 ? shippingAddress.addressLine2.trim() : '',
        landmark: shippingAddress.landmark ? shippingAddress.landmark.trim() : '',
        pincode: shippingAddress.pincode.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        country: 'India',
      },
      items: orderItems,
      subtotal: calculatedSubtotal,
      deliveryFee: Number(deliveryFee),
      discount: Number(discount),
      totalAmount,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'placed',
      notes: notes.trim(),
    });

    await newOrder.save();

    // Trigger automated order confirmation email asynchronously
    sendOrderConfirmationEmail(newOrder).catch((err) => {
      console.error('[Email Warning] Asynchronous email dispatch error:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        orderNumber: newOrder.orderNumber,
        totalAmount: newOrder.totalAmount,
        currency: 'INR',
        customer: newOrder.customer,
        shippingAddress: newOrder.shippingAddress,
        items: newOrder.items,
        paymentStatus: newOrder.paymentStatus,
        createdAt: newOrder.createdAt,
      },
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
    const order = await Order.findOne({ orderNumber }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({
      success: true,
      order,
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
