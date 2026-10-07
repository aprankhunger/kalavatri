import { Link } from 'react-router-dom';
import { FiTrash2, FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useStoreConfig, calculateDeliveryFee } from '../hooks/useStoreConfig';
import Newsletter from '../components/Newsletter';
import './Cart.css';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();
  const { config } = useStoreConfig();
  const { store } = config;
  const maxQty = Number(store.maxQuantityPerItem) || 10;

  const deliveryFee = calculateDeliveryFee(store, cartTotal);
  const finalTotal = cartTotal + deliveryFee;
  const threshold = Number(store.freeShippingThreshold || 0);
  const remainingForFree = threshold > 0 && store.deliveryFee > 0 ? Math.max(0, threshold - cartTotal) : 0;

  return (
    <div className="cart-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> &gt; <span>Cart</span>
        </nav>

        <h1 className="cart-title">YOUR CART</h1>

        {cartItems.length === 0 ? (
          <div className="empty-cart reveal-up">
            <FiShoppingBag size={40} aria-hidden="true" />
            <p>Your cart is empty.</p>
            <Link to="/shop" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items stagger-children visible">
              {cartItems.map((item, index) => (
                <div key={`${item._id}-${item.size}-${item.color}`} className="cart-item">
                  <Link to={`/product/${item.slug}`} className="cart-item-image">
                    <img src={item.image} alt={item.name} />
                  </Link>
                  <div className="cart-item-details">
                    <div className="cart-item-header">
                      <h3 className="cart-item-name">
                        <Link to={`/product/${item.slug}`}>{item.name}</Link>
                      </h3>
                      <button className="remove-btn" onClick={() => removeFromCart(index)} aria-label={`Remove ${item.name}`}>
                        <FiTrash2 size={20} />
                      </button>
                    </div>

                    <div className="cart-item-attributes">
                      <p>Size: <span>{item.size || 'Standard'}</span></p>
                      <p>Color: <span>{item.color || 'As shown'}</span></p>
                    </div>

                    <div className="cart-item-footer">
                      <div className="cart-item-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                      <div className="quantity-selector">
                        <button onClick={() => updateQuantity(index, -1)} disabled={item.quantity <= 1} aria-label="Decrease quantity">-</button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button onClick={() => updateQuantity(index, 1)} disabled={item.quantity >= maxQty} aria-label="Increase quantity">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h3>Order Summary</h3>

              <div className="summary-row">
                <span className="summary-label">Subtotal</span>
                <span className="summary-value">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Delivery Fee</span>
                <span className="summary-value">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toLocaleString('en-IN')}`}</span>
              </div>

              {remainingForFree > 0 && (
                <p className="free-ship-hint">
                  Add ₹{remainingForFree.toLocaleString('en-IN')} more for free delivery.
                </p>
              )}

              <div className="divider"></div>

              <div className="summary-row total-row">
                <span>Total</span>
                <span>₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>

              <p className="promo-note">Have a coupon? Apply it at checkout.</p>

              <Link to="/checkout" className="btn btn-primary btn-full checkout-btn">
                Go to Checkout <FiArrowRight size={20} />
              </Link>
              <Link to="/shop" className="continue-link">Continue shopping</Link>
            </div>
          </div>
        )}
      </div>

      <section style={{ padding: 0, position: 'relative', zIndex: 10, marginTop: '80px' }}>
        <div className="container">
          <Newsletter />
        </div>
      </section>
    </div>
  );
};

export default Cart;
