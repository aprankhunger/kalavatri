import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiCheck } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { _id, name, slug, price, originalPrice, discount, image, sizes = [], colors = [], inStock = true } = product;
  const { addToCart, isInCart } = useCart();
  const navigate = useNavigate();
  const inCart = isInCart(_id);

  const imageWebp =
    typeof image === 'string' && image.startsWith('/images/') && image.endsWith('.jpg')
      ? image.replace(/\.jpg$/, '.webp')
      : null;

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
        <picture>
          {imageWebp && <source srcSet={imageWebp} type="image/webp" />}
          <img src={image} alt={name} loading="lazy" decoding="async" width="800" height="800" />
        </picture>
        {discount > 0 && <span className="product-card-tag">-{discount}%</span>}
      </div>
      <div className="product-card-body">
        <h3 className="product-name">{name}</h3>
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

export default memo(ProductCard);
