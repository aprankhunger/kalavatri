import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import './PolicyPage.css';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-page">
      <div className="container">
        <div className="policy-breadcrumb">
          <Link to="/">Home</Link>
          <span className="separator">›</span>
          <span>Privacy Policy</span>
        </div>

        <h1 className="policy-title">Privacy Policy</h1>
        <p className="policy-updated">Last updated: October 2026</p>

        <div className="policy-section">
          <h2>1. Introduction</h2>
          <p>
            At Kalavatri, we respect your privacy and are committed to protecting the personal
            information you share with us. This Privacy Policy explains how we collect, use, store,
            and disclose your information when you visit our website or make a purchase.
          </p>
        </div>

        <div className="policy-section">
          <h2>2. Information We Collect</h2>
          <p><strong>Personal Information:</strong> When you create an account, place an order, or contact us, we may collect:</p>
          <ul>
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Shipping and billing address</li>
            <li>Payment information (processed securely through third-party payment gateways)</li>
          </ul>
          <p><strong>Automatically Collected Information:</strong> We may also collect:</p>
          <ul>
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Pages visited and time spent on the website</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>To process and fulfill your orders</li>
            <li>To communicate with you about your orders, account, or inquiries</li>
            <li>To personalise your shopping experience</li>
            <li>To send promotional emails and offers (you can opt out at any time)</li>
            <li>To improve our website, products, and services</li>
            <li>To detect and prevent fraud or unauthorised activities</li>
            <li>To comply with legal obligations</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>4. Cookies</h2>
          <p>
            Our website uses cookies to enhance your browsing experience. Cookies are small text
            files stored on your device that help us remember your preferences and understand how
            you interact with our site. You can manage or disable cookies through your browser
            settings; however, doing so may affect the functionality of the website.
          </p>
        </div>

        <div className="policy-section">
          <h2>5. Sharing of Information</h2>
          <p>We do not sell, rent, or trade your personal information. We may share your data with:</p>
          <ul>
            <li><strong>Service Providers:</strong> Third-party companies that assist with payment processing, shipping, and email delivery.</li>
            <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets.</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>6. Data Security</h2>
          <p>
            We implement appropriate technical and organisational measures to protect your personal
            information from unauthorised access, alteration, disclosure, or destruction. However,
            no method of transmission over the internet is 100% secure, and we cannot guarantee
            absolute security.
          </p>
        </div>

        <div className="policy-section">
          <h2>7. Data Retention</h2>
          <p>
            We retain your personal information only for as long as necessary to fulfill the
            purposes outlined in this policy or as required by law. Once your data is no longer
            needed, it will be securely deleted or anonymised.
          </p>
        </div>

        <div className="policy-section">
          <h2>8. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal data</li>
            <li>Withdraw consent for data processing</li>
            <li>Opt out of marketing communications</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:supportkalavatri@gmail.com">supportkalavatri@gmail.com</a>.
          </p>
        </div>

        <div className="policy-section">
          <h2>9. Third-Party Links</h2>
          <p>
            Our website may contain links to third-party websites. We are not responsible for the
            privacy practices or content of these external sites. We encourage you to review the
            privacy policies of any third-party websites you visit.
          </p>
        </div>

        <div className="policy-section">
          <h2>10. Children's Privacy</h2>
          <p>
            Our website is not intended for individuals under the age of 18. We do not knowingly
            collect personal information from children. If we become aware that we have collected
            data from a minor, we will take steps to delete it promptly.
          </p>
        </div>

        <div className="policy-section">
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this
            page with an updated "Last Updated" date. We encourage you to review this policy
            periodically.
          </p>
        </div>

        <div className="policy-contact">
          <h3>Contact Us</h3>
          <p>If you have any questions or concerns about our Privacy Policy, please reach out:</p>
          <p>Email: <a href="mailto:supportkalavatri@gmail.com">supportkalavatri@gmail.com</a></p>
        </div>

        <a
          className="policy-back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑ Back to top
        </a>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
