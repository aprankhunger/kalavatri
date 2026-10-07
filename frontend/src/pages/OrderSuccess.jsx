import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiPackage, FiMail, FiMapPin, FiPhone, FiArrowRight } from 'react-icons/fi';
import axios from 'axios';
import './OrderSuccess.css';

const OrderSuccess = () => {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`/api/orders/${orderNumber}`);
        if (res.data?.success) {
          setOrder(res.data.order);
        }
      } catch {
        // Fallback for visual display if backend is offline
        setOrder({
          orderNumber,
          customer: { name: 'Valued Customer', email: 'your email address' },
          shippingAddress: { city: 'your city', state: 'India' },
          totalAmount: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    if (orderNumber) {
      fetchOrder();
    }
  }, [orderNumber]);

  return (
    <div className="order-success-page">
      <div className="container">
        <div className="success-card">
          <div className="success-icon-wrap">
            <FiCheckCircle size={56} className="check-icon" />
          </div>

          <span className="badge-confirmed">Order Confirmed</span>
          <h1 className="success-title">THANK YOU FOR YOUR ORDER!</h1>
          <p className="order-num-pill">
            Order Reference: <strong>#{orderNumber}</strong>
          </p>

          <div className="email-alert-box">
            <FiMail size={22} className="alert-icon" />
            <div>
              <p className="email-alert-title">Confirmation Email Sent</p>
              <p className="email-alert-desc">
                We have sent an order confirmation along with your receipt to{' '}
                <strong>{order?.customer?.email || 'your email'}</strong>.
              </p>
            </div>
          </div>

          {order && (
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
                  <span>Total Amount Paid:</span>
                  <strong>₹{order.totalAmount?.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

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
