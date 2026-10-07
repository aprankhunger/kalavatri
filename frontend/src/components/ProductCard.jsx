import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiCheck } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

const STAR_PATH =
  'M9.44772 1.39174C9.28185 1.05037 8.79979 1.05037 8.63391 1.39174L6.50547 5.77259L1.80206 6.47169C1.43323 6.52649 1.28588 6.98402 1.5529 7.24765L4.95461 10.6041L4.15243 15.4215C4.08945 15.7993 4.47545 16.0822 4.80521 15.9126L9.04082 13.7371L13.2764 15.9126C13.6062 16.0822 13.9922 15.7993 13.9292 15.4215L13.127 10.6041L16.5287 7.24765C16.7958 6.98402 16.6484 6.52649 16.2796 6.47169L11.5762 5.77259L9.44772 1.39174Z';

const ProductCard = ({ product }) => {
  const { _id, name, slug, price, originalPrice, discount, image, rating = 0, sizes = [], colors = [], inStock = true } = product;
  const { addToCart, isInCart } = useCart();
  const navigate = useNavigate();
  const inCart = isInCart(_id);

  const handleCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) {
      navigate('/cart');
      return;
    }
    addToCart(product, 1, sizes[0] ?? null, colors[0] ?? null);
  };

  return (
    <Link to={`/product/${slug}`} className="product-card">
      <div className="product-card-image">
        <img src={image} alt={name} loading="lazy" />
        {discount > 0 && <span className="product-card-tag">-{discount}%</span>}
      </div>
      <div className="product-card-body">
        <h3 className="product-name">{name}</h3>
        <div className="product-rating" aria-label={`Rated ${Number(rating).toFixed(1)} out of 5`}>
          <div className="stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <svg key={i} width="18" height="18" viewBox="0 0 18 18" className={i < Math.floor(rating) ? 'star-filled' : 'star-empty'}>
                <path d={STAR_PATH} />
              </svg>
            ))}
          </div>
          <span className="rating-text">{Number(rating).toFixed(1)}/5</span>
        </div>
        <div className="product-price">
          <span className="price-current">₹{Number(price).toLocaleString('en-IN')}</span>
          {originalPrice && <span className="price-original">₹{Number(originalPrice).toLocaleString('en-IN')}</span>}
          {discount > 0 && <span className="price-discount">-{discount}%</span>}
        </div>
        <button
          type="button"
          className={`card-cart-btn ${inCart ? 'in-cart' : ''}`}
          onClick={handleCartClick}
          disabled={!inStock}
        >
          <span key={inCart ? 'view' : 'add'} className="card-cart-label">
            {!inStock ? (
              'Sold Out'
            ) : inCart ? (
              <>
                <FiCheck size={16} aria-hidden="true" /> View Cart
              </>
            ) : (
              <>
                <FiShoppingCart size={16} aria-hidden="true" /> Add to Cart
              </>
            )}
          </span>
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
