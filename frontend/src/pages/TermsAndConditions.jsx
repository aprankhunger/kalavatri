import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import './PolicyPage.css';

const TermsAndConditions = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-page">
      <div className="container">
        <div className="policy-breadcrumb">
          <Link to="/">Home</Link>
          <span className="separator">›</span>
          <span>Terms &amp; Conditions</span>
        </div>

        <h1 className="policy-title">Terms &amp; Conditions</h1>
        <p className="policy-updated">Last updated: October 2026</p>

        <div className="policy-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Kalavatri. These Terms and Conditions govern your use of our website and
            the purchase of products from our online store. By accessing or using our website, you
            agree to be bound by these terms. If you do not agree, please refrain from using our
            services.
          </p>
        </div>

        <div className="policy-section">
          <h2>2. Eligibility</h2>
          <p>
            By using this website, you confirm that you are at least 18 years of age or are
            accessing the website under the supervision of a parent or legal guardian. You agree
            to provide accurate and complete information when creating an account or placing an order.
          </p>
        </div>

        <div className="policy-section">
          <h2>3. Products &amp; Pricing</h2>
          <ul>
            <li>All product descriptions, images, and pricing are provided as accurately as possible. However, we do not warrant that descriptions or pricing are error-free.</li>
            <li>Prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.</li>
            <li>We reserve the right to modify prices at any time without prior notice. Price changes will not affect orders already confirmed.</li>
            <li>Product colours may vary slightly from images displayed on the website due to screen settings and photography lighting.</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>4. Orders &amp; Payment</h2>
          <ul>
            <li>Placing an order constitutes an offer to purchase. We reserve the right to accept or reject any order at our sole discretion.</li>
            <li>Payment must be made at the time of placing the order through the available payment methods on the website.</li>
            <li>In the event of a payment failure, the order will not be processed. Any amounts debited will be refunded within 5–7 business days.</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>5. Shipping &amp; Delivery</h2>
          <ul>
            <li>We aim to dispatch all orders within 2–4 business days from the date of order confirmation.</li>
            <li>Delivery timelines may vary based on the destination and are estimated, not guaranteed.</li>
            <li>Risk of loss and damage passes to you upon delivery of the product to the shipping carrier.</li>
            <li>We are not responsible for delays caused by shipping carriers, natural calamities, or other events beyond our control.</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>6. Intellectual Property</h2>
          <p>
            All content on this website — including but not limited to text, images, logos, graphics,
            designs, and software — is the property of Kalavatri and is protected under applicable
            intellectual property laws. You may not reproduce, distribute, or use any content without
            our prior written consent.
          </p>
        </div>

        <div className="policy-section">
          <h2>7. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the website for any unlawful or prohibited purpose.</li>
            <li>Attempt to gain unauthorised access to any part of the website or its systems.</li>
            <li>Interfere with or disrupt the website's functionality.</li>
            <li>Submit false, misleading, or fraudulent information.</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Kalavatri shall not be liable for any
            indirect, incidental, special, or consequential damages arising from or related to your
            use of the website or purchase of products. Our total liability shall not exceed the
            amount paid by you for the specific product in question.
          </p>
        </div>

        <div className="policy-section">
          <h2>9. Disclaimer</h2>
          <p>
            The website and all products are provided "as is" without warranties of any kind, either
            express or implied. We do not guarantee that the website will be uninterrupted, secure,
            or error-free.
          </p>
        </div>

        <div className="policy-section">
          <h2>10. Governing Law</h2>
          <p>
            These Terms and Conditions are governed by and construed in accordance with the laws of
            India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts
            in India.
          </p>
        </div>

        <div className="policy-section">
          <h2>11. Changes to These Terms</h2>
          <p>
            We reserve the right to update or modify these Terms and Conditions at any time. Changes
            will be effective immediately upon posting on this page. Your continued use of the
            website constitutes acceptance of the revised terms.
          </p>
        </div>

        <div className="policy-contact">
          <h3>Questions?</h3>
          <p>If you have any questions about these Terms &amp; Conditions, please contact us:</p>
          <p>Email: <a href="mailto:support@kalavatri.in">support@kalavatri.in</a></p>
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

export default TermsAndConditions;
