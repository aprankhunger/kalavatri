import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiShield, 
  FiTruck, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiLoader
} from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { validateCoupon, createOrder, verifyPayment, cancelOrder, lookupPincode } from '../services/api';
import { useStoreConfig, calculateDeliveryFee } from '../hooks/useStoreConfig';
import './Checkout.css';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

// Load the Razorpay checkout script once, on demand.
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    pincode: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    notes: '',
  });

  // UI / Status states
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeDetected, setPincodeDetected] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const { config } = useStoreConfig();

  const deliveryFee = calculateDeliveryFee(config.store, cartTotal);
  const discountAmount = appliedCoupon ? Math.min(Number(appliedCoupon.discount) || 0, cartTotal) : 0;
  const grandTotal = Math.max(0, cartTotal + deliveryFee - discountAmount);

  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setPromoMessage('Your cart changed — please re-apply your coupon.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartTotal]);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field-specific error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    // Trigger pincode detection when 6 digits are entered
    if (name === 'pincode') {
      const cleanPin = value.replace(/\D/g, '').slice(0, 6);
      if (cleanPin.length === 6) {
        fetchPincodeDetails(cleanPin);
      } else {
        setPincodeDetected(false);
        setPincodeError('');
      }
    }
  };

  // Auto-detect City and State using Indian Pincode
  const fetchPincodeDetails = async (pin) => {
    setPincodeLoading(true);
    setPincodeError('');

    try {
      // First try our backend proxy endpoint (same configurable API origin)
      const data = await lookupPincode(pin);
      if (data?.success && data?.city && data?.state) {
        setFormData((prev) => ({
          ...prev,
          city: data.city,
          state: data.state,
        }));
        setPincodeDetected(true);
        setPincodeLoading(false);
        return;
      }
    } catch {
      // Fallback: direct public postal API
      try {
        const directRes = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await directRes.json();
        if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          const detectedCity = po.District || po.Block || po.Circle || '';
          const detectedState = po.State || '';

          setFormData((prev) => ({
            ...prev,
            city: detectedCity,
            state: detectedState,
          }));
          setPincodeDetected(true);
          setPincodeLoading(false);
          return;
        }
      } catch {
        // If both fails, allow manual entry
      }
    }

    setPincodeLoading(false);
    setPincodeError('Could not auto-fetch PIN code. Please type your City and State below.');
  };

  // Promo code validation
  const handleApplyPromo = async (e) => {
    e.preventDefault();
    const cleanPromo = promoCode.trim().toUpperCase();
    if (!cleanPromo || promoLoading) return;
    setPromoLoading(true);
    const result = await validateCoupon({ code: cleanPromo, subtotal: cartTotal, email: formData.email.trim() || undefined });
    setPromoLoading(false);
    if (result.valid) {
      setAppliedCoupon(result);
      setPromoMessage(result.message || `${cleanPromo} applied`);
    } else {
      setAppliedCoupon(null);
      setPromoMessage(result.message || 'Invalid promo code');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setPromoCode('');
    setPromoMessage('');
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Mobile number is required';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    const cleanPin = formData.pincode.replace(/\D/g, '');
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'PIN code is required';
    } else if (cleanPin.length !== 6) {
      newErrors.pincode = 'PIN code must be exactly 6 digits';
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address line 1 (Flat/House/Building) is required';
    }
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Open the Razorpay checkout for a created (reserved) order.
  const openRazorpay = (order, razorpay) => {
    const options = {
      key: razorpay.keyId,
      amount: razorpay.amount,
      currency: razorpay.currency || 'INR',
      name: 'Kalavatri',
      description: `Order ${order.orderNumber}`,
      order_id: razorpay.orderId,
      prefill: { name: formData.name, email: formData.email, contact: formData.phone },
      notes: { orderNumber: order.orderNumber },
      theme: { color: '#8B2635' },
      handler: async (response) => {
        try {
          const result = await verifyPayment({
            orderNumber: order.orderNumber,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (result?.success) {
            clearCart();
            navigate(`/order-success/${order.orderNumber}`);
          } else {
            setSubmitError(result?.message || 'Payment could not be verified. If you were charged, contact support with your order number.');
            setSubmitting(false);
          }
        } catch (err) {
          setSubmitError(err.response?.data?.message || 'Payment verification failed. If you were charged, please contact support with your order number.');
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: async () => {
          await cancelOrder(order.orderNumber, razorpay.orderId).catch(() => {});
          setSubmitError('Payment was cancelled, so your order was not placed. Your cart is intact.');
          setSubmitting(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', async () => {
      await cancelOrder(order.orderNumber, razorpay.orderId).catch(() => {});
      setSubmitError('Your payment did not go through. Please try again.');
      setSubmitting(false);
    });
    rzp.open();
  };

  // Handle Order Placement
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (cartItems.length === 0) {
      setSubmitError('Your cart is empty.');
      return;
    }

    if (!validateForm()) {
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        },
        shippingAddress: {
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          landmark: formData.landmark,
          pincode: formData.pincode,
          city: formData.city,
          state: formData.state,
        },
        items: cartItems.map((item) => ({
          _id: item._id,
          slug: item.slug,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
        couponCode: appliedCoupon?.code || '',
        notes: formData.notes,
      };

      const res = await createOrder(payload);
      if (!res?.success || !res?.order?.orderNumber) {
        throw new Error(res?.message || 'Failed to place order');
      }

      const { order, razorpay } = res;

      // No online gateway (dev / zero-amount already paid) → straight to success.
      if (!razorpay?.orderId) {
        clearCart();
        navigate(`/order-success/${order.orderNumber}`);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        await cancelOrder(order.orderNumber, razorpay.orderId).catch(() => {});
        setSubmitError('Could not load the secure payment window. Please check your connection and try again.');
        setSubmitting(false);
        return;
      }

      openRazorpay(order, razorpay);
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || 'Something went wrong while placing your order. Please try again.');
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="checkout-empty container">
        <h2>Your Cart is Empty</h2>
        <p>Please select your favourite handcrafted juttis before proceeding to checkout.</p>
        <Link to="/" className="btn btn-primary">
          Explore Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        {/* Navigation Breadcrumb */}
        <div className="checkout-nav">
          <Link to="/cart" className="back-link">
            <FiArrowLeft /> Back to Cart
          </Link>
        </div>

        <div className="checkout-layout">
          {/* Left Column: Guest Details & Shipping Form */}
          <div className="checkout-main">
            <div className="checkout-header-block">
              <h1 className="checkout-title">EXPRESS GUEST CHECKOUT</h1>
              <p className="checkout-subtitle">
                No password or account required. Enter your delivery details to complete your order.
              </p>
            </div>

            <form onSubmit={handlePlaceOrder} className="checkout-form" noValidate>
              {/* Step 1: Customer Contact Info */}
              <div className="form-section">
                <div className="section-header">
                  <span className="step-num">1</span>
                  <h3>Contact Information</h3>
                </div>

                <div className="form-group">
                  <label htmlFor="name">Full Name <span className="req">*</span></label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="e.g. Radhika Sharma"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? 'input-error' : ''}
                    autoComplete="name"
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="email">Email Address <span className="req">*</span></label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="e.g. radhika@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? 'input-error' : ''}
                      autoComplete="email"
                    />
                    <small className="helper-text">Your order confirmation & receipt will be sent here</small>
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label htmlFor="phone">Phone Number <span className="req">*</span></label>
                    <div className="phone-input-wrapper">
                      <span className="country-prefix">+91</span>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        placeholder="10-digit mobile number"
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength={10}
                        className={errors.phone ? 'input-error' : ''}
                        autoComplete="tel"
                      />
                    </div>
                    <small className="helper-text">Used for courier delivery updates</small>
                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                  </div>
                </div>
              </div>

              {/* Step 2: Delivery & Shipping Address */}
              <div className="form-section">
                <div className="section-header">
                  <span className="step-num">2</span>
                  <h3>Shipping Address</h3>
                </div>

                {/* PINCODE FIELD (WITH AUTO-DETECTION) */}
                <div className="form-group">
                  <label htmlFor="pincode">
                    PIN Code <span className="req">*</span>
                    <span className="pincode-hint">(City & State will be auto-detected)</span>
                  </label>
                  <div className="pincode-wrapper">
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      placeholder="e.g. 110001 or 400001"
                      value={formData.pincode}
                      onChange={handleChange}
                      maxLength={6}
                      className={errors.pincode ? 'input-error' : ''}
                    />
                    {pincodeLoading && (
                      <span className="pincode-indicator loading" role="status" aria-live="polite">
                        <FiLoader className="spin" aria-hidden="true" /> Detecting...
                      </span>
                    )}
                    {pincodeDetected && !pincodeLoading && (
                      <span className="pincode-indicator success">
                        <FiCheckCircle aria-hidden="true" /> Verified
                      </span>
                    )}
                  </div>

                  {pincodeError && <div className="pincode-warn-pill" role="status" aria-live="polite"><FiAlertCircle aria-hidden="true" /> {pincodeError}</div>}
                  {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                </div>

                {/* ADDRESS LINE 1 */}
                <div className="form-group">
                  <label htmlFor="addressLine1">
                    Flat / House No. / Building / Floor <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    placeholder="e.g. Flat 402, Royal Palms, 4th Floor"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    className={errors.addressLine1 ? 'input-error' : ''}
                  />
                  {errors.addressLine1 && <span className="field-error">{errors.addressLine1}</span>}
                </div>

                {/* ADDRESS LINE 2 */}
                <div className="form-group">
                  <label htmlFor="addressLine2">
                    Street / Colony / Area <span className="opt">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    placeholder="e.g. MG Road, Near HDFC Bank"
                    value={formData.addressLine2}
                    onChange={handleChange}
                  />
                </div>

                {/* LANDMARK */}
                <div className="form-group">
                  <label htmlFor="landmark">
                    Landmark <span className="opt">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="landmark"
                    name="landmark"
                    placeholder="e.g. Opposite City Mall"
                    value={formData.landmark}
                    onChange={handleChange}
                  />
                </div>

                {/* CITY & STATE (AUTO-FILLED & EDITABLE) */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="city">City / District <span className="req">*</span></label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      placeholder="e.g. New Delhi"
                      value={formData.city}
                      onChange={handleChange}
                      className={errors.city ? 'input-error' : ''}
                    />
                    {errors.city && <span className="field-error">{errors.city}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label htmlFor="state">State <span className="req">*</span></label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      placeholder="e.g. Delhi"
                      value={formData.state}
                      onChange={handleChange}
                      className={errors.state ? 'input-error' : ''}
                    />
                    {errors.state && <span className="field-error">{errors.state}</span>}
                  </div>
                </div>

                {/* DELIVERY NOTES */}
                <div className="form-group">
                  <label htmlFor="notes">Delivery Instructions <span className="opt">(Optional)</span></label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows="2"
                    placeholder="Any specific instructions for courier delivery..."
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Step 3: Payment Options & Guarantee */}
              <div className="form-section">
                <div className="section-header">
                  <span className="step-num">3</span>
                  <h3>Payment Method</h3>
                </div>

                <div className="payment-options">
                  <label className="payment-card-option selected">
                    <input type="radio" name="paymentMethod" defaultChecked />
                    <div className="payment-info">
                      <div className="payment-title">
                        <span>Razorpay Secure Payment</span>
                        <span className="badge-instant">Recommended</span>
                      </div>
                      <p className="payment-desc">
                        UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and Wallets.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="trust-features">
                  <div className="trust-item">
                    <FiShield size={20} className="trust-icon" />
                    <span>100% Secure &amp; Verified</span>
                  </div>
                  <div className="trust-item">
                    <FiTruck size={20} className="trust-icon" />
                    <span>Free Shipping Across India</span>
                  </div>
                  <div className="trust-item">
                    <FiCheckCircle size={20} className="trust-icon" />
                    <span>Artisan Handcrafted Quality</span>
                  </div>
                </div>
              </div>

              {/* Mobile Submit Button (sticky/bottom) */}
              <div className="form-submit-block">
                {submitError && (
                  <div className="checkout-error-banner" role="alert">
                    <FiAlertCircle aria-hidden="true" /> {submitError}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary btn-full submit-order-btn"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? (
                    <>
                      <FiLoader className="spin" aria-hidden="true" /> Processing Order...
                    </>
                  ) : (
                    `Place Order & Pay ₹${grandTotal.toLocaleString()}`
                  )}
                </button>
                <p className="privacy-terms-note">
                  By placing your order, you agree to Kalavatri&apos;s{' '}
                  <Link to="/terms-and-conditions">Terms &amp; Conditions</Link> and{' '}
                  <Link to="/refund-policy">Replacement Policy</Link>.
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="checkout-sidebar">
            <div className="order-summary-card">
              <h3 className="summary-title">Order Summary ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</h3>

              <div className="summary-items-list">
                {cartItems.map((item, index) => (
                  <div key={`${item._id}-${index}`} className="summary-item-row">
                    <div className="summary-item-thumb">
                      <img src={item.image} alt={item.name} />
                      <span className="item-qty-badge">{item.quantity}</span>
                    </div>
                    <div className="summary-item-details">
                      <h4 className="item-name">{item.name}</h4>
                      <p className="item-variant">
                        Size: <strong>{item.size || 'Standard'}</strong> | Color: <strong>{item.color || 'As Shown'}</strong>
                      </p>
                      <span className="item-price">₹{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Input */}
              <form onSubmit={handleApplyPromo} className="promo-box">
                <label htmlFor="promo-code" className="sr-only">Promo code</label>
                <input
                  id="promo-code"
                  type="text"
                  placeholder="Promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <button type="button" className="btn btn-outline btn-sm" onClick={removeCoupon}>
                    Remove
                  </button>
                ) : (
                  <button type="submit" className="btn btn-outline btn-sm" disabled={promoLoading}>
                    {promoLoading ? 'Checking…' : 'Apply'}
                  </button>
                )}
              </form>
              {promoMessage && (
                <p className={`promo-status ${appliedCoupon ? 'success' : 'error'}`} role="status">
                  {promoMessage}
                </p>
              )}

              <div className="summary-breakdown">
                <div className="breakdown-row">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toLocaleString()}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="breakdown-row discount-row">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="breakdown-row">
                  <span>Delivery Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="free-shipping">FREE</span>
                  ) : (
                    <span>₹{deliveryFee.toLocaleString()}</span>
                  )}
                </div>

                <div className="breakdown-divider"></div>

                <div className="breakdown-row total-row">
                  <span>Total Amount</span>
                  <span className="grand-total-val">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="sidebar-policy-box">
                <p>
                  <strong>⚡ Hassle-Free Dispatch:</strong> Orders are handcrafted with utmost care and dispatched within 2–4 business days via insured courier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
