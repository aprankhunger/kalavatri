import { useState } from 'react';
import { FiMail } from 'react-icons/fi';
import './Newsletter.css';

const Newsletter = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) setEmail('');
  };

  return (
    <div className="newsletter-box">
      <h2 className="newsletter-title">
        STAY UP TO DATE ABOUT<br />OUR LATEST OFFERS
      </h2>
      <form className="newsletter-form" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <FiMail className="input-icon" />
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-gold btn-full">
          Subscribe to Newsletter
        </button>
      </form>
    </div>
  );
};

export default Newsletter;
