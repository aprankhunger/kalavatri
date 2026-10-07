import { Link } from 'react-router-dom';
import { FiInstagram, FiFacebook, FiTwitter, FiYoutube, FiMail, FiPhone } from 'react-icons/fi';
import { useStoreConfig } from '../hooks/useStoreConfig';
import './Footer.css';

const Footer = () => {
  const { config } = useStoreConfig();
  const { footer, categories } = config;

  const socials = [
    { url: footer.instagramUrl, label: 'Instagram', icon: <FiInstagram size={14} /> },
    { url: footer.facebookUrl, label: 'Facebook', icon: <FiFacebook size={14} /> },
    { url: footer.twitterUrl, label: 'Twitter', icon: <FiTwitter size={14} /> },
    { url: footer.youtubeUrl, label: 'YouTube', icon: <FiYoutube size={14} /> },
  ].filter((s) => s.url);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="footer-brand">KALAVATRI</div>
            <p className="footer-desc">{footer.description}</p>
            {socials.length > 0 && (
              <div className="social-links">
                {socials.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="social-link" aria-label={s.label}>
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>SHOP</h4>
              <ul>
                <li><Link to="/shop">All Juttis</Link></li>
                <li><Link to="/shop?sort=newest">New Arrivals</Link></li>
                <li><Link to="/shop?badge=sale">On Sale</Link></li>
                <li><Link to="/cart">Your Cart</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>COLLECTIONS</h4>
              <ul>
                {categories.slice(0, 5).map((c) => (
                  <li key={c.slug}><Link to={`/shop?category=${c.slug}`}>{c.name}</Link></li>
                ))}
              </ul>
            </div>
            <div className="footer-col">
              <h4>HELP</h4>
              <ul>
                <li><Link to="/terms-and-conditions">Terms & Conditions</Link></li>
                <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                <li><Link to="/refund-policy">Refund & Cancellation</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>CONTACT</h4>
              <ul>
                {footer.contactEmail && (
                  <li>
                    <a href={`mailto:${footer.contactEmail}`} className="footer-contact">
                      <FiMail size={14} aria-hidden="true" /> {footer.contactEmail}
                    </a>
                  </li>
                )}
                {footer.contactPhone && (
                  <li>
                    <a href={`tel:${footer.contactPhone.replace(/\s/g, '')}`} className="footer-contact">
                      <FiPhone size={14} aria-hidden="true" /> {footer.contactPhone}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Kalavatri © 2024-{new Date().getFullYear()}, All Rights Reserved</p>
          <div className="payment-badges">
            <span className="badge">VISA</span>
            <span className="badge">MC</span>
            <span className="badge">UPI</span>
            <span className="badge">RUPAY</span>
            <span className="badge">GPAY</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
