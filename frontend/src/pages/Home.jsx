import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';
import TestimonialCard from '../components/TestimonialCard';
import Newsletter from '../components/Newsletter';
import { getProducts, getReviews } from '../services/api';
import './Home.css';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [productsData, reviewsData] = await Promise.all([
        getProducts(),
        getReviews(),
      ]);
      setProducts(productsData);
      setReviews(reviewsData);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading]);

  const newArrivals = products.filter((p) => p.badge === 'new').slice(0, 4);
  const bestsellers = products.filter((p) => p.badge === 'bestseller' || p.badge === 'sale').slice(0, 4);

  // Pad if needed
  if (bestsellers.length < 4) {
    const remaining = products.filter((p) => !newArrivals.includes(p) && !bestsellers.includes(p));
    bestsellers.push(...remaining.slice(0, 4 - bestsellers.length));
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <Hero />

      {/* Brand Strip (Figma Style) */}
      <div className="brand-strip">
        <div className="container">
          <div className="brand-strip-inner">
            <span>ZARDOZI</span>
            <span>KUNDAN</span>
            <span>MIRROR WORK</span>
            <span>PHULKARI</span>
            <span>THREAD ART</span>
          </div>
        </div>
      </div>

      {/* New Arrivals */}
      <section className="section" id="new-arrivals">
        <div className="container">
          <div className="section-header animate-on-scroll">
            <h2>NEW ARRIVALS</h2>
          </div>
          <div className="products-grid animate-on-scroll">
            {newArrivals.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
          <div className="view-all-wrapper animate-on-scroll">
            <button className="btn btn-outline btn-full-mobile">View All</button>
          </div>
        </div>
      </section>

      <hr className="section-divider container animate-on-scroll" />

      {/* Top Selling */}
      <section className="section" id="bestsellers">
        <div className="container">
          <div className="section-header animate-on-scroll">
            <h2>TOP SELLING</h2>
          </div>
          <div className="products-grid animate-on-scroll">
            {bestsellers.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
          <div className="view-all-wrapper animate-on-scroll">
            <button className="btn btn-outline btn-full-mobile">View All</button>
          </div>
        </div>
      </section>

      {/* Categories (Asymmetric Grid like Figma) */}
      <section className="section categories-section animate-on-scroll" id="categories">
        <div className="container">
          <div className="categories-container">
            <div className="section-header">
              <h2>BROWSE BY JUTTI STYLE</h2>
            </div>
            <div className="categories-grid">
              <div className="category-card size-sm">
                <span className="category-title">Bridal</span>
                <img src="/images/jutti_red_bridal.jpg" alt="Bridal" loading="lazy" />
              </div>
              <div className="category-card size-lg">
                <span className="category-title">Festive</span>
                <img src="/images/jutti_maroon_gold.jpg" alt="Festive" loading="lazy" />
              </div>
              <div className="category-card size-lg">
                <span className="category-title">Everyday</span>
                <img src="/images/jutti_pink_floral.jpg" alt="Everyday" loading="lazy" />
              </div>
              <div className="category-card size-sm">
                <span className="category-title">Designer</span>
                <img src="/images/jutti_black_leaf.jpg" alt="Designer" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section" id="testimonials">
        <div className="container">
          <div className="section-header align-left animate-on-scroll">
            <h2>OUR HAPPY CUSTOMERS</h2>
            <div className="slider-nav">
              <button className="slider-btn">←</button>
              <button className="slider-btn">→</button>
            </div>
          </div>
          <div className="testimonials-slider animate-on-scroll">
            {reviews.slice(0, 3).map((review) => (
              <TestimonialCard key={review._id} review={review} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter (Overlapping Footer) */}
      <section style={{ padding: 0, position: 'relative', zIndex: 10 }}>
        <div className="container">
          <Newsletter />
        </div>
      </section>
    </>
  );
};

export default Home;
