import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiPackage, FiMail, FiMapPin, FiPhone, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import { getOrder } from '../services/api';
import './OrderSuccess.css';

const OrderSuccess = () => {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getOrder(orderNumber);
        if (!active) return;
        if (res?.success && res.order) {
          setOrder(res.order);
        } else {
          setError('not_found');
        }
      } catch (err) {
        if (!active) return;
        // Never fabricate a "confirmed" order — surface the real failure.
        setError(err?.response?.status === 404 ? 'not_found' : 'unavailable');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (orderNumber) fetchOrder();
    return () => {
      active = false;
    };
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="order-success-page">
        <div className="container">
          <div className="success-card">
            <p className="order-num-pill">Loading your order…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isNotFound = error === 'not_found';
    return (
      <div className="order-success-page">
        <div className="container">
          <div className="success-card">
            <div className="success-icon-wrap">
              <FiAlertCircle size={56} className="check-icon" />
            </div>
            <h1 className="success-title">
              {isNotFound ? 'Order not found' : 'Unable to load your order'}
            </h1>
            <p className="order-num-pill">
              {isNotFound ? (
                <>We couldn’t find an order with reference <strong>#{orderNumber}</strong>.</>
              ) : (
                <>Something went wrong fetching <strong>#{orderNumber}</strong>. Please try again shortly.</>
              )}
            </p>
            <p className="email-alert-desc" style={{ marginTop: '0.75rem' }}>
              If you were charged, your confirmation email is the authoritative record of your order.
              Please contact support with your reference number if you need help.
            </p>
            <div className="success-actions">
              <Link to="/" className="btn btn-primary continue-btn">
                Continue Shopping <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === 'paid';

  return (
    <div className="order-success-page">
      <div className="container">
        <div className="success-card">
          <div className="success-icon-wrap">
            <FiCheckCircle size={56} className="check-icon" />
          </div>

          <span className="badge-confirmed">{isPaid ? 'Order Confirmed' : 'Order Placed'}</span>
          <h1 className="success-title">THANK YOU FOR YOUR ORDER!</h1>
          <p className="order-num-pill">
            Order Reference: <strong>#{order.orderNumber || orderNumber}</strong>
          </p>

          <div className="email-alert-box">
            <FiMail size={22} className="alert-icon" />
            <div>
              <p className="email-alert-title">Confirmation Email Sent</p>
              <p className="email-alert-desc">
                We have sent an order confirmation along with your receipt to{' '}
                <strong>{order.customer?.email || 'your email'}</strong>.
              </p>
            </div>
          </div>

          <div className="order-details-grid">
            {/* Delivery Address */}
            <div className="details-card">
              <h3>
                <FiMapPin /> Delivery Address
              </h3>
              <p className="recipient-name">
                <strong>{order.customer?.name}</strong>
              </p>
              <p>{order.shippingAddress?.addressLine1}</p>
              {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              {order.shippingAddress?.landmark && <p>Landmark: {order.shippingAddress.landmark}</p>}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} —{' '}
                <strong>{order.shippingAddress?.pincode}</strong>
              </p>
              <p className="phone-line">
                <FiPhone size={14} /> +91 {order.customer?.phone}
              </p>
            </div>

            {/* Order Status & Delivery Timeline */}
            <div className="details-card">
              <h3>
                <FiPackage /> Delivery Status
              </h3>
              <p className="status-badge-live">
                <span className="dot"></span> Order Processing &amp; Crafting
              </p>
              <p className="status-note">
                Your handcrafted leather juttis are being prepared with care. Dispatch within 2–4 business days with courier tracking updates.
              </p>
              <div className="payment-total-box">
                <span>{isPaid ? 'Total Amount Paid:' : 'Order Total:'}</span>
                <strong>₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          <div className="success-actions">
            <Link to="/" className="btn btn-primary continue-btn">
              Continue Shopping <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
