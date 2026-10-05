import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiPackage,
  FiShoppingBag,
  FiUsers,
  FiTag,
  FiFileText,
  FiShield,
  FiSettings,
  FiLogOut,
  FiExternalLink,
  FiMenu,
  FiX,
  FiCheckCircle,
} from 'react-icons/fi';
import { useAdminAuth } from './context/AdminAuthContext';
import { ADMIN_PATH, ADMIN_NAV_SECTIONS, ADMIN_ROLE_LABELS } from './config/adminConfig';
import './styles/admin.css';
import './AdminLayout.css';

const ICON_MAP = {
  FiGrid: <FiGrid size={18} />,
  FiPackage: <FiPackage size={18} />,
  FiShoppingBag: <FiShoppingBag size={18} />,
  FiUsers: <FiUsers size={18} />,
  FiTag: <FiTag size={18} />,
  FiFileText: <FiFileText size={18} />,
  FiShield: <FiShield size={18} />,
  FiSettings: <FiSettings size={18} />,
};

const AdminLayout = () => {
  const { adminUser, logout, hasPermission, hasRole } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutConfirm = async () => {
    await logout();
    navigate(`${ADMIN_PATH}/login`, { replace: true });
  };

  return (
    <div className="admin-scope admin-layout">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div className="admin-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon">KV</div>
          <div className="admin-brand-text">
            <h2>KALAVATRI</h2>
            <span>Staff Management</span>
          </div>
          <button className="admin-mobile-close" onClick={() => setMobileMenuOpen(false)}>
            <FiX size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="admin-user-profile-card">
          <div className="admin-avatar">
            {adminUser?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="admin-user-meta">
            <span className="admin-user-name">{adminUser?.name || 'Administrator'}</span>
            <span className="admin-badge admin-badge-gold">
              {ADMIN_ROLE_LABELS[adminUser?.role] || adminUser?.role}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="admin-nav">
          {ADMIN_NAV_SECTIONS.map((section) => {
            // Filter items based on permissions/roles
            const visibleItems = section.items.filter((item) => {
              if (item.roles && !hasRole(item.roles)) return false;
              if (item.permission && !hasPermission(item.permission)) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="admin-nav-group">
                <div className="admin-nav-group-title">{section.title}</div>
                {visibleItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive: navActive }) =>
                        `admin-nav-item ${navActive || isActive ? 'active' : ''}`
                      }
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="admin-nav-icon">{ICON_MAP[item.icon] || <FiGrid size={18} />}</span>
                      <span className="admin-nav-label">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-store-link">
            <FiExternalLink size={15} />
            <span>Open Public Store</span>
          </a>
          <button className="admin-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <FiLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="admin-main-wrapper">
        {/* Top Header */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button className="admin-hamburger" onClick={() => setMobileMenuOpen(true)}>
              <FiMenu size={22} />
            </button>
            <div className="admin-breadcrumb">
              <span className="admin-portal-badge">PORTAL CONSOLE</span>
              <span className="admin-current-path">{location.pathname.replace(ADMIN_PATH, '') || '/dashboard'}</span>
            </div>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-security-pill">
              <FiCheckCircle size={14} color="#10B981" />
              <span>2FA SECURED</span>
            </div>

            <div className="admin-account-summary">
              <span className="admin-account-email">{adminUser?.email}</span>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="admin-content-area">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-box">
            <h3>Confirm Sign Out</h3>
            <p>Are you sure you want to end your active administrator session? Any unsaved edits will be discarded.</p>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="admin-btn admin-btn-primary" onClick={handleLogoutConfirm}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
