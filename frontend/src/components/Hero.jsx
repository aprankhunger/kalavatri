import { useEffect, useRef, useState } from 'react';
import { useStoreConfig } from '../hooks/useStoreConfig';
import SmartLink from './SmartLink';
import './Hero.css';

const STAR = (
  <svg viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <path d="M28 0L35.6105 20.3895L56 28L35.6105 35.6105L28 56L20.3895 35.6105L0 28L20.3895 20.3895L28 0Z" fill="currentColor" />
  </svg>
);

const parseStat = (value) => {
  const match = String(value).match(/^(\D*)([\d,.]+)(.*)$/);
  if (!match) return null;
  const target = Number(match[2].replace(/,/g, ''));
  if (Number.isNaN(target)) return null;
  return { prefix: match[1], target, suffix: match[3] };
};

const CountUp = ({ value, delay = 0 }) => {
  const parsed = parseStat(value);
  const ref = useRef(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!parsed || !ref.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(parsed.target);
      return;
    }
    let frame;
    let timeout;
    const duration = 1600;
    const run = () => {
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setCurrent(Math.round(parsed.target * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        timeout = setTimeout(run, delay);
        observer.disconnect();
      }
    });
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [parsed?.target, delay]);

  if (!parsed) return <span className="stat-number">{value}</span>;

  return (
    <span className="stat-number" ref={ref} aria-label={value}>
      <span aria-hidden="true">
        {parsed.prefix}
        {current.toLocaleString('en-IN')}
        {parsed.suffix}
      </span>
    </span>
  );
};

const Hero = () => {
  const { config } = useStoreConfig();
  const { hero } = config;

  const heroSrc = hero.image || '/images/hero_banner.jpg';
  const heroWebp =
    heroSrc.startsWith('/images/') && heroSrc.endsWith('.jpg')
      ? heroSrc.replace(/\.jpg$/, '.webp')
      : null;

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
                className="btn btn-primary btn-full-mobile hero-cta reveal-up"
                style={{ animationDelay: '220ms' }}
              >
                {hero.ctaLabel}
                <span className="hero-cta-arrow" aria-hidden="true">→</span>
              </SmartLink>
            )}

            {hero.stats?.length > 0 && (
              <dl className="hero-stats">
                {hero.stats.map((stat, i) => (
                  <div
                    key={stat.label + i}
                    className="hero-stat reveal-up"
                    style={{ animationDelay: `${340 + i * 110}ms` }}
                  >
                    <dt className="stat-label">{stat.label}</dt>
                    <dd>
                      <CountUp value={stat.value} delay={340 + i * 110} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="hero-image">
            <div className="hero-image-wrapper">
              <div className="hero-image-frame">
                <picture>
                  {heroWebp && <source srcSet={heroWebp} type="image/webp" />}
                  <img
                    src={heroSrc}
                    alt="Kalavatri handcrafted juttis"
                    className="hero-image-reveal"
                    width="1376"
                    height="768"
                    fetchPriority="high"
                    decoding="async"
                  />
                </picture>
              </div>
              <div className="hero-star star-1">{STAR}</div>
              <div className="hero-star star-2">{STAR}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
