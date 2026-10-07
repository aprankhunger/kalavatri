import { useStoreConfig } from '../hooks/useStoreConfig';
import SmartLink from './SmartLink';
import './Hero.css';

const STAR = (
  <svg viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <path d="M28 0L35.6105 20.3895L56 28L35.6105 35.6105L28 56L20.3895 35.6105L0 28L20.3895 20.3895L28 0Z" fill="currentColor" />
  </svg>
);

const Hero = () => {
  const { config } = useStoreConfig();
  const { hero } = config;

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-inner">
          <div className="hero-content">
            <h1 className="hero-title reveal-up text-balance">{hero.title}</h1>
            <p className="hero-description reveal-up" style={{ animationDelay: '120ms' }}>{hero.subtitle}</p>
            {hero.ctaLabel && (
              <SmartLink
                to={hero.ctaUrl || '/shop'}
                className="btn btn-primary btn-full-mobile reveal-up"
                style={{ animationDelay: '220ms' }}
              >
                {hero.ctaLabel}
              </SmartLink>
            )}

            {hero.stats?.length > 0 && (
              <div className="hero-stats reveal-up" style={{ animationDelay: '320ms' }}>
                {hero.stats.map((stat, i) => (
                  <div key={stat.label + i} className="hero-stat-group">
                    {i > 0 && <div className="stat-divider" />}
                    <div className="hero-stat">
                      <span className="stat-number">{stat.value}</span>
                      <span className="stat-label">{stat.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hero-image">
            <img src={hero.image || '/images/hero_banner.jpg'} alt="Kalavatri handcrafted juttis" className="hero-image-reveal" />
            <div className="hero-star star-1">{STAR}</div>
            <div className="hero-star star-2">{STAR}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
