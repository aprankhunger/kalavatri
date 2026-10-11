import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    shippingAddress: {
      addressLine1: { type: String, required: true, trim: true },
      addressLine2: { type: String, trim: true, default: '' },
      landmark: { type: String, trim: true, default: '' },
      pincode: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      country: { type: String, default: 'India' },
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String, required: true },
        image: { type: String },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        size: { type: Number },
        color: { type: String },
        subtotal: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cod', 'upi'],
      default: 'razorpay',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    orderStatus: {
      type: String,
      enum: ['placed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    trackingNumber: { type: String, default: null },
    courierName: { type: String, default: null },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

// Short order number, e.g. "KV-10001". NOTE: the live checkout path runs on
// Supabase/Postgres and gets its number from the next_order_number() DB
// sequence (see migration 004); this helper is a fallback for the Mongoose path.
orderSchema.statics.generateOrderNumber = function () {
  return `KV-${Math.floor(10000 + Math.random() * 90000)}`;
};

const Order = mongoose.model('Order', orderSchema);

export default Order;
