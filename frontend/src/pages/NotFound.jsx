import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '80px 20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: "'Poppins', sans-serif"
    }}>
      <h1 style={{
        fontSize: '72px',
        color: 'var(--maroon)',
        fontFamily: "'Playfair Display', serif",
        marginBottom: '10px'
      }}>
        404
      </h1>
      <h2 style={{
        fontSize: '22px',
        color: 'var(--text-dark)',
        marginBottom: '16px'
      }}>
        Page Not Found
      </h2>
      <p style={{
        color: 'var(--text-body)',
        fontSize: '15px',
        lineHeight: '1.6',
        marginBottom: '28px'
      }}>
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;
