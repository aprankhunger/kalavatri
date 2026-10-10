import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductBySlug, getProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import Newsletter from '../components/Newsletter';
import { useCart } from '../context/CartContext';
import './ProductDetail.css';

const ProductDetail = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('details');
  const [isAdded, setIsAdded] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Reset isAdded if user changes their mind on size or color
  useEffect(() => {
    setIsAdded(false);
  }, [selectedSize, selectedColor]);

  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      window.scrollTo(0, 0);
      const data = await getProductBySlug(slug);
      setProduct(data);
      
      // Fetch related products (just first 4 for now)
      const allProducts = await getProducts();
      setRelatedProducts(allProducts.filter(p => p.slug !== slug).slice(0, 4));
      
      if (data) {
        if (data.sizes && data.sizes.length > 0) setSelectedSize(data.sizes[0]);
        if (data.colors && data.colors.length > 0) setSelectedColor(data.colors[0]);
      }
      setLoading(false);
    };
    fetchProductData();
  }, [slug]);

  const renderStars = (rating) => {
    const stars = [];
    const full = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <svg key={i} width="20" height="20" viewBox="0 0 18 18" fill="none" className={i < full ? 'star-filled' : 'star-empty'}>
          <path d="M9.44772 1.39174C9.28185 1.05037 8.79979 1.05037 8.63391 1.39174L6.50547 5.77259L1.80206 6.47169C1.43323 6.52649 1.28588 6.98402 1.5529 7.24765L4.95461 10.6041L4.15243 15.4215C4.08945 15.7993 4.47545 16.0822 4.80521 15.9126L9.04082 13.7371L13.2764 15.9126C13.6062 16.0822 13.9922 15.7993 13.9292 15.4215L13.127 10.6041L16.5287 7.24765C16.7958 6.98402 16.6484 6.52649 16.2796 6.47169L11.5762 5.77259L9.44772 1.39174Z" />
        </svg>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h2>Product Not Found</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '20px' }}>Back to Home</Link>
      </div>
    );
  }

  // Generate fake thumbnails by repeating the main image for the Figma layout
  const thumbnails = [product.image, product.image, product.image];

  // Map color names to hex codes for UI
  const colorMap = {
    'Maroon': '#731F26',
    'Gold': '#D9AE79',
    'Pink': '#FFB6C1',
    'Green': '#2E8B57',
    'Blue': '#000080',
    'Silver': '#C0C0C0',
    'Red': '#FF0000',
    'Ivory': '#FFFFF0',
    'Pearl': '#FDF6E3',
    'Yellow': '#FFD700',
    'Multi': '#FF4500',
    'Black': '#000000'
  };

  return (
    <div className="product-detail-page">
      {/* Breadcrumbs */}
      <div className="container">
        <div className="breadcrumbs">
          <Link to="/">Home</Link> &gt; <Link to="/#categories">Shop</Link> &gt; <Link to="/#categories">{product.category}</Link> &gt; <span>{product.name}</span>
        </div>
      </div>

      {/* Product Main Section */}
      <section className="product-main container">
        <div className="product-gallery">
          <div className="thumbnails">
            {thumbnails.map((img, idx) => (
              <div key={idx} className="thumbnail active">
                <img src={img} alt={`Thumbnail ${idx+1}`} />
              </div>
            ))}
          </div>
          <div className="main-image">
            <img src={product.image} alt={product.name} />
          </div>
        </div>

        <div className="product-info">
          <h1 className="pdp-title">{product.name}</h1>
          
          <div className="pdp-rating">
            <div className="stars">{renderStars(product.rating)}</div>
            <span className="rating-text">{product.rating.toFixed(1)}/5</span>
          </div>
          
          <div className="pdp-price">
            <span className="price-current">₹{product.price.toLocaleString()}</span>
            {product.originalPrice && (
              <span className="price-original">₹{product.originalPrice.toLocaleString()}</span>
            )}
            {product.discount > 0 && (
              <span className="price-discount">-{product.discount}%</span>
            )}
          </div>
          
          <p className="pdp-description">{product.description}</p>
          
          <div className="divider"></div>

          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <div className="pdp-colors">
              <span className="option-label">Select Colors</span>
              <div className="color-options">
                {product.colors.map(color => (
                  <button 
                    key={color} 
                    className={`color-btn ${selectedColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: colorMap[color] || '#000' }}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                  >
                    {selectedColor === color && <span className="checkmark">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="divider"></div>

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="pdp-sizes">
              <div className="pdp-sizes-header">
                <span className="option-label">Choose Size</span>
                <button
                  type="button"
                  className="size-guide-link"
                  onClick={() => setShowSizeGuide(true)}
                >
                  📏 Size Guide
                </button>
              </div>
              <div className="size-options">
                {product.sizes.map(size => (
                  <button 
                    key={size} 
                    className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="divider"></div>

          {/* Add to Cart Actions */}
          <div className="pdp-actions">
            <div className="quantity-selector">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            
            {isAdded ? (
              <Link to="/cart" className="btn add-to-cart-btn view-cart-btn" style={{ textAlign: 'center' }}>
                View Cart →
              </Link>
            ) : (
              <button 
                className="btn btn-primary add-to-cart-btn"
                onClick={() => {
                  addToCart(product, quantity, selectedSize, selectedColor);
                  setIsAdded(true);
                }}
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="product-tabs container">
        <div className="tab-headers">
          <button 
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Product Details
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Rating & Reviews
          </button>
          <button 
            className={`tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            FAQs
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'details' && (
            <div className="tab-pane">
              <h3>Product Specification</h3>
              <p>{product.description}</p>
              <ul style={{ marginTop: '20px', marginLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}><strong>Material:</strong> 100% Genuine Leather</li>
                <li style={{ marginBottom: '10px' }}><strong>Sole:</strong> Cushioned Double-padded</li>
                <li style={{ marginBottom: '10px' }}><strong>Embellishment:</strong> Hand-stitched Zardozi / Threadwork</li>
                <li style={{ marginBottom: '10px' }}><strong>Care:</strong> Wipe with a clean, dry cloth when needed</li>
              </ul>
            </div>
          )}
          {activeTab === 'reviews' && (
            <div className="tab-pane">
              <h3>Customer Reviews</h3>
              <p>Reviews will be loaded here based on the Figma template.</p>
            </div>
          )}
          {activeTab === 'faq' && (
            <div className="tab-pane">
              <h3>Frequently Asked Questions</h3>
              <p>How do I find my size? Please refer to the size chart above. Juttis expand slightly to take the shape of your feet.</p>
            </div>
          )}
        </div>
      </section>

      {/* You Might Also Like */}
      <section className="section" id="related-products">
        <div className="container">
          <div className="section-header">
            <h2 style={{ textAlign: 'center' }}>YOU MIGHT ALSO LIKE</h2>
          </div>
          <div className="products-grid">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section style={{ padding: 0, position: 'relative', zIndex: 10 }}>
        <div className="container">
          <Newsletter />
        </div>
      </section>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="size-guide-overlay" onClick={() => setShowSizeGuide(false)}>
          <div className="size-guide-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="size-guide-close"
              onClick={() => setShowSizeGuide(false)}
              aria-label="Close size guide"
            >
              ×
            </button>
            <h3 className="size-guide-title">Size Guide</h3>
            <img src="/images/size-guide.webp" alt="Jutti size guide chart" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
