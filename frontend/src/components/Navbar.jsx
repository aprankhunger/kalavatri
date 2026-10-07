import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiMenu, FiX } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import './Navbar.css';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const { cartCount } = useCart();

  return (
    <>
      {/* Announcement Bar */}
      {announcementVisible && (
        <div className="announcement-bar">
          <span>
            Get 20% off your first order with code <strong>KALAVATRI20</strong> | Free Shipping across India
          </span>
          <button className="close-btn" onClick={() => setAnnouncementVisible(false)} aria-label="Close">
            <FiX />
          </button>
        </div>
      )}

      {/* Navbar */}
      <header className="navbar">
        <div className="container">
          <nav className="navbar-inner">
            <div className="nav-left">
              <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
              <Link to="/" className="navbar-brand">KALAVATRI</Link>
            </div>

            <div className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
              <a href="#new-arrivals" onClick={() => setMobileOpen(false)}>Shop</a>
              <a href="#new-arrivals" onClick={() => setMobileOpen(false)}>On Sale</a>
              <a href="#new-arrivals" onClick={() => setMobileOpen(false)}>New Arrivals</a>
              <a href="#categories" onClick={() => setMobileOpen(false)}>Brands</a>
            </div>

            <div className="nav-right">
              <div className="search-bar">
                <FiSearch className="search-icon" />
                <input type="text" placeholder="Search for products..." />
              </div>
              <div className="nav-actions">
                <button className="mobile-search-btn"><FiSearch size={24} /></button>
                <Link to="/cart" className="cart-btn" aria-label="Cart">
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
