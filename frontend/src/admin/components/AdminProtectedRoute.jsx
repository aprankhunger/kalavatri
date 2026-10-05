import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ADMIN_PATH } from '../config/adminConfig';

const AdminProtectedRoute = ({ requiredRoles = [], requiredPermission = null }) => {
  const { isAuthenticated, isLoading, hasRole, hasPermission, adminUser } = useAdminAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#1A1414',
        color: '#D9AE79',
        fontFamily: "'Poppins', sans-serif"
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(217, 174, 121, 0.2)',
          borderTopColor: '#D9AE79',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '16px', letterSpacing: '2px', fontSize: '13px', textTransform: 'uppercase' }}>
          Verifying Security Credentials...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`${ADMIN_PATH}/login`} replace />;
  }

  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div style={{
        padding: '60px 24px',
        textAlign: 'center',
        maxWidth: '560px',
        margin: '0 auto',
        fontFamily: "'Poppins', sans-serif"
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ color: '#731F26', fontFamily: "'Playfair Display', serif", fontSize: '28px', marginBottom: '12px' }}>
          Access Restricted
        </h2>
        <p style={{ color: 'rgba(42, 34, 32, 0.7)', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
          Your role (<strong>{adminUser?.role?.replace('_', ' ').toUpperCase()}</strong>) does not have authorization
          to view this module. If you require access, contact the Super Admin at support@kalavatri.in.
        </p>
        <a
          href={`${ADMIN_PATH}/dashboard`}
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            backgroundColor: '#731F26',
            color: '#fff',
            borderRadius: '9999px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Permission Denied ({requiredPermission})</h3>
      </div>
    );
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
