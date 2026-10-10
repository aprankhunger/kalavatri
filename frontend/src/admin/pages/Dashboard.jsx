import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiShield,
  FiPackage,
  FiShoppingBag,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiLock,
  FiAlertTriangle,
  FiArrowRight,
} from 'react-icons/fi';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ADMIN_PATH, ADMIN_ROLE_LABELS } from '../config/adminConfig';
import adminApi from '../services/adminApi';
import './Dashboard.css';

const Dashboard = () => {
  const { adminUser, hasRole } = useAdminAuth();
  const [systemHealth, setSystemHealth] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    // Fetch health status
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setSystemHealth(data))
      .catch(() => setSystemHealth({ status: 'offline', database: 'disconnected' }));

    // If super admin, fetch latest 5 audit logs
    if (hasRole(['super_admin'])) {
      adminApi
        .get('/audit-logs?limit=5')
        .then((res) => setRecentLogs(res.data.logs || []))
        .catch(() => {});
    }
  }, [hasRole]);

  return (
    <div className="admin-dashboard-page">
      {/* Welcome Banner */}
      <div className="admin-welcome-banner">
        <div className="admin-welcome-content">
          <h1>Welcome, {adminUser?.name || 'Administrator'}</h1>
          <p>
            KALAVATRI Administrative Console &bull; Role:{' '}
            <strong>{ADMIN_ROLE_LABELS[adminUser?.role] || adminUser?.role}</strong>
          </p>
        </div>
        <div className="admin-status-badge">
          <span className="admin-status-dot pulse" />
          <span>System Active</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="admin-metrics-grid">
        <div className="admin-card admin-metric-card">
          <div className="admin-metric-icon icon-maroon">
            <FiShield size={24} />
          </div>
          <div className="admin-metric-data">
            <span className="admin-metric-label">Security Protocol</span>
            <div className="admin-metric-val">2FA Active</div>
            <span className="admin-metric-sub">TOTP Guard &bull; Rate Limited</span>
          </div>
        </div>

        <div className="admin-card admin-metric-card">
          <div className="admin-metric-icon icon-gold">
            <FiPackage size={24} />
          </div>
          <div className="admin-metric-data">
            <span className="admin-metric-label">Store Database</span>
            <div className="admin-metric-val">
              {systemHealth?.database === 'connected' ? 'Connected' : 'Offline / Standby'}
            </div>
            <span className="admin-metric-sub">MongoDB Engine</span>
          </div>
        </div>

        <div className="admin-card admin-metric-card">
          <div className="admin-metric-icon icon-blue">
            <FiLock size={24} />
          </div>
          <div className="admin-metric-data">
            <span className="admin-metric-label">Session Protection</span>
            <div className="admin-metric-val">HttpOnly JWT</div>
            <span className="admin-metric-sub">Auto-Logout Off</span>
          </div>
        </div>

        <div className="admin-card admin-metric-card">
          <div className="admin-metric-icon icon-green">
            <FiClock size={24} />
          </div>
          <div className="admin-metric-data">
            <span className="admin-metric-label">Last Login</span>
            <div className="admin-metric-val">
              {adminUser?.lastLoginAt
                ? new Date(adminUser.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'First Session'}
            </div>
            <span className="admin-metric-sub">
              {adminUser?.lastLoginAt ? new Date(adminUser.lastLoginAt).toLocaleDateString() : 'Secure setup'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="admin-dashboard-grid">
        {/* Security Center Widget */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <FiShield color="#D9AE79" /> Security Center &bull; Specification Compliance
            </h3>
            <span className="admin-badge admin-badge-success">Sec 4 Mandatory</span>
          </div>

          <div className="admin-checklist">
            <div className="admin-check-item">
              <FiCheckCircle color="#10B981" size={18} />
              <div>
                <strong>Bcrypt Password Hashing (12 Rounds)</strong>
                <p>Passwords stored as salted one-way hashes. Common passwords and lengths under 12 blocked.</p>
              </div>
            </div>

            <div className="admin-check-item">
              <FiCheckCircle color="#10B981" size={18} />
              <div>
                <strong>Two-Factor Authentication (TOTP + Backup Codes)</strong>
                <p>Mandatory for Super Admin / Owner. Compatible with Google Authenticator and Authy.</p>
              </div>
            </div>

            <div className="admin-check-item">
              <FiCheckCircle color="#10B981" size={18} />
              <div>
                <strong>Lockout Safeguard & Rate Limiter</strong>
                <p>Accounts temporarily locked for 15 minutes after 5 consecutive failed attempts.</p>
              </div>
            </div>

            <div className="admin-check-item">
              <FiCheckCircle color="#10B981" size={18} />
              <div>
                <strong>HttpOnly, Secure, SameSite Cookie Sessions</strong>
                <p>Zero tokens stored in localStorage. Protected against XSS token harvesting.</p>
              </div>
            </div>

            <div className="admin-check-item">
              <FiCheckCircle color="#10B981" size={18} />
              <div>
                <strong>Append-Only Audit Trail</strong>
                <p>Immutable event logging recording actor, IP, timestamp, and entity diffs.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Audit Activity */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <FiShoppingBag color="#D9AE79" /> Quick Operations
            </h3>
            <span className="admin-badge admin-badge-gold">Phase 1 Foundation</span>
          </div>

          <div className="admin-quick-links">
            <Link to={`${ADMIN_PATH}/audit-logs`} className="admin-quick-link-btn">
              <div>
                <strong>View Audit Trail</strong>
                <p>Review administrative activity, logins, and system changes</p>
              </div>
              <FiArrowRight size={18} />
            </Link>

            <a href="/" target="_blank" rel="noopener noreferrer" className="admin-quick-link-btn">
              <div>
                <strong>Visit Public Storefront</strong>
                <p>Preview kalavatri.in live catalog and customer view</p>
              </div>
              <FiArrowRight size={18} />
            </a>
          </div>

          {hasRole(['super_admin']) && recentLogs.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--admin-gold)' }}>
                Recent Security Events
              </h4>
              <div className="admin-mini-logs">
                {recentLogs.map((log) => (
                  <div key={log._id} className="admin-mini-log-item">
                    <span className="admin-badge admin-badge-gold">{log.action}</span>
                    <span className="admin-mini-log-actor">{log.adminEmail}</span>
                    <span className="admin-mini-log-time">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
