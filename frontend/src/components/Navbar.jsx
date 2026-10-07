import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiMenu, FiX } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useStoreConfig } from '../hooks/useStoreConfig';
import SmartLink from './SmartLink';
import './Navbar.css';

const DISMISS_KEY = 'kalavatri_announcement_dismissed';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [dismissedText, setDismissedText] = useState(() => sessionStorage.getItem(DISMISS_KEY));
  const [query, setQuery] = useState('');
  const [bump, setBump] = useState(false);
  const { cartCount } = useCart();
  const { config } = useStoreConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const previousCount = useRef(cartCount);

  const { announcement, navigation } = config;
  const showAnnouncement = announcement.enabled && announcement.text && dismissedText !== announcement.text;

  useEffect(() => {
    if (cartCount > previousCount.current) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 450);
      previousCount.current = cartCount;
      return () => clearTimeout(timer);
    }
    previousCount.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  const dismissAnnouncement = () => {
    sessionStorage.setItem(DISMISS_KEY, announcement.text);
    setDismissedText(announcement.text);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    navigate(term ? `/shop?search=${encodeURIComponent(term)}` : '/shop');
  };

  const isLinkActive = (url) => `${location.pathname}${location.search}` === url;

  return (
    <>
      {showAnnouncement && (
        <div
          className="announcement-bar"
          style={{ backgroundColor: announcement.backgroundColor, color: announcement.textColor }}
        >
          <span>
            {announcement.text}{' '}
            {announcement.linkLabel && announcement.linkUrl && (
              <SmartLink to={announcement.linkUrl} className="announcement-link" style={{ color: announcement.textColor }}>
                {announcement.linkLabel}
              </SmartLink>
            )}
          </span>
          {announcement.dismissible && (
            <button
              className="close-btn"
              onClick={dismissAnnouncement}
              aria-label="Dismiss announcement"
              style={{ color: announcement.textColor }}
            >
              <FiX />
            </button>
          )}
        </div>
      )}

      <header className="navbar">
        <div className="container">
          <nav className="navbar-inner" aria-label="Main">
            <div className="nav-left">
              <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
              <Link to="/" className="navbar-brand">KALAVATRI</Link>
            </div>

            <div className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
              {navigation.links.map((link) =>
                /^https?:\/\//i.test(link.url) ? (
                  <a key={link.label + link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                ) : (
                  <NavLink
                    key={link.label + link.url}
                    to={link.url}
                    className={() => (isLinkActive(link.url) ? 'active' : '')}
                  >
                    {link.label}
                  </NavLink>
                )
              )}
            </div>

            <div className="nav-right">
              <form className={`search-bar ${mobileSearchOpen ? 'mobile-visible' : ''}`} onSubmit={handleSearch} role="search">
                <FiSearch className="search-icon" aria-hidden="true" />
                <label htmlFor="nav-search" className="sr-only">Search products</label>
                <input
                  id="nav-search"
                  type="search"
                  placeholder="Search for products..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </form>
              <div className="nav-actions">
                <button
                  className="mobile-search-btn"
                  onClick={() => setMobileSearchOpen((v) => !v)}
                  aria-label="Toggle search"
                >
                  <FiSearch size={24} />
                </button>
                <Link to="/cart" className={`cart-btn ${bump ? 'cart-bump' : ''}`} aria-label={`Cart, ${cartCount} items`}>
                  <FiShoppingCart size={24} />
                  {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
};

export default Navbar;
