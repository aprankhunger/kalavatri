import { Link } from 'react-router-dom';
import { FiTrash2, FiArrowRight } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import Newsletter from '../components/Newsletter';
import './Cart.css';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();

  const deliveryFee = 150;
  const discount = 0;
  const finalTotal = cartTotal + deliveryFee - discount;

  return (
    <div className="cart-page">
      <div className="container">
        <div className="breadcrumbs">
          <Link to="/">Home</Link> &gt; <span>Cart</span>
        </div>

        <h1 className="cart-title">YOUR CART</h1>

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '24px' }}>
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {cartItems.map((item, index) => (
                <div key={`${item._id}-${index}`} className="cart-item">
                  <div className="cart-item-image">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="cart-item-details">
                    <div className="cart-item-header">
                      <h3 className="cart-item-name">{item.name}</h3>
                      <button 
                        className="remove-btn" 
                        onClick={() => removeFromCart(index)}
                        aria-label="Remove item"
                      >
                        <FiTrash2 size={20} color="#FF3333" />
                      </button>
                    </div>
                    
                    <div className="cart-item-attributes">
                      <p>Size: <span>{item.size || 'Standard'}</span></p>
                      <p>Color: <span>{item.color || 'As shown'}</span></p>
                    </div>
                    
                    <div className="cart-item-footer">
                      <div className="cart-item-price">₹{item.price.toLocaleString()}</div>
                      <div className="quantity-selector">
                        <button onClick={() => updateQuantity(index, -1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(index, 1)}>+</button>
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
                <span className="summary-value">₹{cartTotal.toLocaleString()}</span>
              </div>
              
              <div className="summary-row">
                <span className="summary-label">Discount (-0%)</span>
                <span className="summary-value discount-value">-₹{discount.toLocaleString()}</span>
              </div>
              
              <div className="summary-row">
                <span className="summary-label">Delivery Fee</span>
                <span className="summary-value">₹{deliveryFee.toLocaleString()}</span>
              </div>
              
              <div className="divider"></div>
              
              <div className="summary-row total-row">
                <span>Total</span>
                <span>₹{finalTotal.toLocaleString()}</span>
              </div>
              
              <div className="promo-code">
                <input type="text" placeholder="Add promo code" />
                <button className="btn btn-primary">Apply</button>
              </div>
              
              <Link to="/checkout" className="btn btn-primary btn-full checkout-btn">
                Go to Checkout <FiArrowRight size={20} />
              </Link>
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
