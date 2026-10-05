import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import './PolicyPage.css';

const RefundPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policy-page">
      <div className="container">
        <div className="policy-breadcrumb">
          <Link to="/">Home</Link>
          <span className="separator">›</span>
          <span>Refund &amp; Cancellation Policy</span>
        </div>

        <h1 className="policy-title">Refund &amp; Cancellation Policy</h1>
        <p className="policy-updated">Last updated: October 2026</p>

        <div className="policy-highlight">
          <p>
            At Kalavatri, all sales are final. We do <strong>not</strong> offer refunds or
            cancellations. However, we do provide <strong>replacements for defective products</strong>{' '}
            if a claim is raised within <strong>7 days</strong> of delivery.
          </p>
        </div>

        <div className="policy-section">
          <h2>1. No Refund Policy</h2>
          <p>
            Once an order is placed and confirmed, it cannot be refunded. We encourage you to
            review all product details, sizes, and descriptions carefully before making a purchase.
          </p>
        </div>

        <div className="policy-section">
          <h2>2. No Cancellation Policy</h2>
          <p>
            Orders cannot be cancelled once they have been placed and confirmed. Since we begin
            processing orders promptly, we are unable to accommodate cancellation requests after
            order confirmation.
          </p>
        </div>

        <div className="policy-section">
          <h2>3. Replacement for Defective Products</h2>
          <p>
            We stand behind the quality of our products. If you receive a defective or damaged item,
            we will provide a <strong>free replacement</strong> subject to the following conditions:
          </p>
          <ul>
            <li>The replacement request must be raised within <strong>7 days</strong> from the date of delivery.</li>
            <li>The product must be unused, unworn, and in its original packaging.</li>
            <li>You must provide clear photographs or a video of the defect as proof.</li>
            <li>The defect must be a manufacturing defect — damage caused by misuse, negligence, or normal wear and tear is not covered.</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>4. How to Request a Replacement</h2>
          <p>To initiate a replacement request, follow these steps:</p>
          <ol>
            <li>
              Email us at <a href="mailto:support@kalavatri.in">support@kalavatri.in</a> within
              7 days of receiving your order.
            </li>
            <li>
              Include your <strong>order number</strong>, <strong>date of delivery</strong>, and a
              clear description of the defect.
            </li>
            <li>
              Attach <strong>photographs or video</strong> clearly showing the defect and the
              product packaging.
            </li>
            <li>
              Our team will review your claim and respond within <strong>2–3 business days</strong>.
            </li>
            <li>
              If approved, we will arrange a pickup of the defective item and dispatch the
              replacement at no additional cost.
            </li>
          </ol>
        </div>

        <div className="policy-section">
          <h2>5. Policy Summary</h2>
          <table className="policy-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Eligible?</th>
                <th>Timeframe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Refund request</td>
                <td>❌ Not available</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Order cancellation</td>
                <td>❌ Not available</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Replacement (defective item)</td>
                <td>✅ Available</td>
                <td>Within 7 days of delivery</td>
              </tr>
              <tr>
                <td>Replacement (change of mind)</td>
                <td>❌ Not available</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Replacement (wrong size ordered)</td>
                <td>❌ Not available</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="policy-section">
          <h2>6. Non-Eligible Items</h2>
          <p>Replacement will not be provided for:</p>
          <ul>
            <li>Products with damage caused by misuse, improper care, or negligence</li>
            <li>Items with minor colour variations from the images displayed on the website</li>
            <li>Products returned without original packaging and tags</li>
            <li>Claims raised after the 7-day window from the date of delivery</li>
          </ul>
        </div>

        <div className="policy-section">
          <h2>7. Shipping for Replacements</h2>
          <p>
            For approved replacement claims, we will bear the cost of return shipping and delivery
            of the replacement item. The replacement product will be dispatched within{' '}
            <strong>5–7 business days</strong> after receiving the defective item.
          </p>
        </div>

        <hr className="policy-divider" />

        <div className="policy-section">
          <h2>8. Important Note</h2>
          <p>
            We reserve the right to reject any replacement claim that does not meet the above
            conditions. Our decision on replacement eligibility is final and binding.
          </p>
        </div>

        <div className="policy-contact">
          <h3>Need Help?</h3>
          <p>If you have any questions about our Refund &amp; Cancellation Policy, please contact us:</p>
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

export default RefundPolicy;
