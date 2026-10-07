import { useState } from 'react';
import { FiMail, FiCheckCircle } from 'react-icons/fi';
import { subscribeNewsletter } from '../services/api';
import './Newsletter.css';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || status.state === 'loading') return;
    setStatus({ state: 'loading', message: '' });
    const result = await subscribeNewsletter(email);
    if (result.success) {
      setEmail('');
      setStatus({ state: 'success', message: result.message });
    } else {
      setStatus({ state: 'error', message: result.message });
    }
  };

  return (
    <div className="newsletter-box">
      <h2 className="newsletter-title">
        STAY UP TO DATE ABOUT<br />OUR LATEST OFFERS
      </h2>
      <form className="newsletter-form" onSubmit={handleSubmit}>
        {status.state === 'success' ? (
          <p className="newsletter-status success" role="status">
            <FiCheckCircle aria-hidden="true" /> {status.message}
          </p>
        ) : (
          <>
            <div className="input-wrapper">
              <FiMail className="input-icon" aria-hidden="true" />
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-gold btn-full" disabled={status.state === 'loading'}>
              {status.state === 'loading' ? 'Subscribing…' : 'Subscribe to Newsletter'}
            </button>
            {status.state === 'error' && (
              <p className="newsletter-status error" role="alert">{status.message}</p>
            )}
          </>
        )}
      </form>
    </div>
  );
};

export default Newsletter;
