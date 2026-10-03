import { FiInstagram, FiFacebook, FiTwitter } from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="footer-brand">KALAVATRI.CO</div>
            <p className="footer-desc">
              We have shoes that suits your style and which you're proud to wear. From women to men.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Twitter"><FiTwitter size={14} /></a>
              <a href="#" className="social-link" aria-label="Facebook"><FiFacebook size={14} /></a>
              <a href="#" className="social-link" aria-label="Instagram"><FiInstagram size={14} /></a>
            </div>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>COMPANY</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Features</a></li>
                <li><a href="#">Works</a></li>
                <li><a href="#">Career</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>HELP</h4>
              <ul>
                <li><a href="#">Customer Support</a></li>
                <li><a href="#">Delivery Details</a></li>
                <li><a href="#">Terms & Conditions</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>FAQ</h4>
              <ul>
                <li><a href="#">Account</a></li>
                <li><a href="#">Manage Deliveries</a></li>
                <li><a href="#">Orders</a></li>
                <li><a href="#">Payments</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>RESOURCES</h4>
              <ul>
                <li><a href="#">Free eBooks</a></li>
                <li><a href="#">Development Tutorial</a></li>
                <li><a href="#">How to - Blog</a></li>
                <li><a href="#">Youtube Playlist</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Kalavatri.co © 2024-2025, All Rights Reserved</p>
          <div className="payment-badges">
            <span className="badge">VISA</span>
            <span className="badge">MC</span>
            <span className="badge">PAYPAL</span>
            <span className="badge">APAY</span>
            <span className="badge">GPAY</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
