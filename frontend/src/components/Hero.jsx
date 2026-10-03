import './Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-inner">
          <div className="hero-content">
            <h1 className="hero-title">
              FIND JUTTIS<br />
              THAT MATCHES<br />
              YOUR STYLE
            </h1>
            <p className="hero-description">
              Browse through our diverse range of meticulously crafted leather juttis, designed to bring out your individuality and cater to your sense of style.
            </p>
            <a href="#new-arrivals" className="btn btn-primary btn-full-mobile">Shop Now</a>
            
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-number">200+</span>
                <span className="stat-label">International Brands</span>
              </div>
              <div className="stat-divider"></div>
              <div className="hero-stat">
                <span className="stat-number">2,000+</span>
                <span className="stat-label">High-Quality Products</span>
              </div>
              <div className="stat-divider mobile-hide"></div>
              <div className="hero-stat stat-full-mobile">
                <span className="stat-number">30,000+</span>
                <span className="stat-label">Happy Customers</span>
              </div>
            </div>
          </div>
          
          <div className="hero-image">
            <img src="/images/hero_banner.jpg" alt="Kalavatri Handcrafted Juttis" />
            <div className="hero-star star-1">
              <svg viewBox="0 0 56 56" fill="none"><path d="M28 0L35.6105 20.3895L56 28L35.6105 35.6105L28 56L20.3895 35.6105L0 28L20.3895 20.3895L28 0Z" fill="#000"/></svg>
            </div>
            <div className="hero-star star-2">
              <svg viewBox="0 0 56 56" fill="none"><path d="M28 0L35.6105 20.3895L56 28L35.6105 35.6105L28 56L20.3895 35.6105L0 28L20.3895 20.3895L28 0Z" fill="#000"/></svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
