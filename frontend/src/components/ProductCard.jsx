import { Link } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { name, slug, price, originalPrice, discount, image, rating } = product;

  // Figma style: Solid stars and fractional stars. We'll use simple fill for now.
  const renderStars = (rating) => {
    const stars = [];
    const full = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <svg key={i} width="18" height="18" viewBox="0 0 18 18" fill="none" className={i < full ? 'star-filled' : 'star-empty'}>
          <path d="M9.44772 1.39174C9.28185 1.05037 8.79979 1.05037 8.63391 1.39174L6.50547 5.77259L1.80206 6.47169C1.43323 6.52649 1.28588 6.98402 1.5529 7.24765L4.95461 10.6041L4.15243 15.4215C4.08945 15.7993 4.47545 16.0822 4.80521 15.9126L9.04082 13.7371L13.2764 15.9126C13.6062 16.0822 13.9922 15.7993 13.9292 15.4215L13.127 10.6041L16.5287 7.24765C16.7958 6.98402 16.6484 6.52649 16.2796 6.47169L11.5762 5.77259L9.44772 1.39174Z" />
        </svg>
      );
    }
    return stars;
  };

  return (
    <Link to={`/product/${slug}`} className="product-card">
      <div className="product-card-image">
        <img src={image} alt={name} loading="lazy" />
      </div>
      <div className="product-card-body">
        <h3 className="product-name">{name}</h3>
        <div className="product-rating">
          <div className="stars">{renderStars(rating)}</div>
          <span className="rating-text">{rating.toFixed(1)}/5</span>
        </div>
        <div className="product-price">
          <span className="price-current">₹{price.toLocaleString()}</span>
          {originalPrice && (
            <span className="price-original">₹{originalPrice.toLocaleString()}</span>
          )}
          {discount > 0 && (
            <span className="price-discount">-{discount}%</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
