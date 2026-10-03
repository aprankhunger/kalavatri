import { FiStar, FiCheckCircle } from 'react-icons/fi';
import './TestimonialCard.css';

const TestimonialCard = ({ review }) => {
  return (
    <div className="testimonial-card">
      <div className="testimonial-stars">
        {[...Array(review.rating)].map((_, i) => (
          <svg key={i} width="22" height="22" viewBox="0 0 18 18" fill="none" className="star-filled">
            <path d="M9.44772 1.39174C9.28185 1.05037 8.79979 1.05037 8.63391 1.39174L6.50547 5.77259L1.80206 6.47169C1.43323 6.52649 1.28588 6.98402 1.5529 7.24765L4.95461 10.6041L4.15243 15.4215C4.08945 15.7993 4.47545 16.0822 4.80521 15.9126L9.04082 13.7371L13.2764 15.9126C13.6062 16.0822 13.9922 15.7993 13.9292 15.4215L13.127 10.6041L16.5287 7.24765C16.7958 6.98402 16.6484 6.52649 16.2796 6.47169L11.5762 5.77259L9.44772 1.39174Z" />
          </svg>
        ))}
      </div>
      <div className="testimonial-name">
        {review.name}
        {review.verified && (
          <span className="verified-badge"><FiCheckCircle size={18} fill="#01AB31" color="white" /></span>
        )}
      </div>
      <p className="testimonial-text">"{review.comment}"</p>
    </div>
  );
};

export default TestimonialCard;
