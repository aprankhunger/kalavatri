import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';
import Newsletter from '../components/Newsletter';
import { useProducts } from '../hooks/useProducts';
import { useStoreConfig } from '../hooks/useStoreConfig';
import './Home.css';

const CRAFTS = ['ZARDOZI', 'KUNDAN', 'MIRROR WORK', 'PHULKARI', 'THREAD ART', 'GOTA PATTI'];

const Home = () => {
  const { products, isLoading: loading } = useProducts();
  const { config } = useStoreConfig();
  const { homepage, categories } = config;

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
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading, homepage.showCategories]);

  const newArrivals = products.filter((p) => p.badge === 'new').slice(0, 4);
  const bestsellers = products.filter((p) => p.badge === 'bestseller' || p.badge === 'sale').slice(0, 4);
  if (newArrivals.length < 4) {
    newArrivals.push(...products.filter((p) => !newArrivals.includes(p)).slice(0, 4 - newArrivals.length));
  }
  if (bestsellers.length < 4) {
    const remaining = products.filter((p) => !newArrivals.includes(p) && !bestsellers.includes(p));
    bestsellers.push(...remaining.slice(0, 4 - bestsellers.length));
  }

  const homeCategories = categories.filter((c) => c.showOnHome !== false).slice(0, 4);
  const sizePattern = ['size-sm', 'size-lg', 'size-lg', 'size-sm'];

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
      </div>
    );
  }

  return (
    <>
      <Hero />

      <div className="brand-strip" aria-hidden="true">
        <div className="brand-strip-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="brand-strip-inner">
              {CRAFTS.map((craft) => (
                <span key={craft} className="brand-strip-item">
                  {craft}
                  <span className="brand-strip-sep">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="section" id="new-arrivals">
        <div className="container">
          <div className="section-header animate-on-scroll">
            <h2>{homepage.newArrivalsTitle}</h2>
          </div>
          <div className="products-grid stagger-children animate-on-scroll">
            {newArrivals.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
          <div className="view-all-wrapper animate-on-scroll">
            <Link to="/shop?sort=newest" className="btn btn-outline btn-full-mobile">View All</Link>
          </div>
        </div>
      </section>

      <hr className="section-divider container animate-on-scroll" />

      <section className="section" id="bestsellers">
        <div className="container">
          <div className="section-header animate-on-scroll">
            <h2>{homepage.topSellingTitle}</h2>
          </div>
          <div className="products-grid stagger-children animate-on-scroll">
            {bestsellers.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
          <div className="view-all-wrapper animate-on-scroll">
            <Link to="/shop?sort=popular" className="btn btn-outline btn-full-mobile">View All</Link>
          </div>
        </div>
      </section>

      {homepage.showCategories && homeCategories.length > 0 && (
        <section className="section categories-section animate-on-scroll" id="categories">
          <div className="container">
            <div className="categories-container">
              <div className="section-header">
                <h2>{homepage.categoriesTitle}</h2>
              </div>
              <div className="categories-grid">
                {homeCategories.map((cat, i) => (
                  <Link
                    key={cat.slug}
                    to={`/shop?category=${cat.slug}`}
                    className={`category-card ${sizePattern[i % sizePattern.length]}`}
                  >
                    <span className="category-title">{cat.name}</span>
                    {cat.image && <img src={cat.image} alt="" loading="lazy" />}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section style={{ padding: 0, position: 'relative', zIndex: 10 }}>
        <div className="container">
          <Newsletter />
        </div>
      </section>
    </>
  );
};

export default Home;
