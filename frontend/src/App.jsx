import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerLayout from './components/CustomerLayout';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import NotFound from './pages/NotFound';

import { AdminAuthProvider } from './admin/context/AdminAuthContext';
import { ADMIN_PATH } from './admin/config/adminConfig';
import AdminProtectedRoute from './admin/components/AdminProtectedRoute';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/pages/AdminLogin';
import Dashboard from './admin/pages/Dashboard';
import AuditLogs from './admin/pages/AuditLogs';
import ProductsList from './admin/pages/ProductsList';
import ProductForm from './admin/pages/ProductForm';
import InventoryManager from './admin/pages/InventoryManager';

import './App.css';

function App() {
  return (
    <AdminAuthProvider>
      <Router>
        <Routes>
          {/* Public Customer Storefront Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            {/* Decoy 404 for standard /admin so bots cannot detect portal */}
            <Route path="/admin" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Secret Obfuscated Admin Portal Routes */}
          <Route path={`${ADMIN_PATH}/login`} element={<AdminLogin />} />

          <Route path={ADMIN_PATH} element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to={`${ADMIN_PATH}/dashboard`} replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<ProductsList />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id/edit" element={<ProductForm />} />
              <Route path="inventory" element={<InventoryManager />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              {/* Fallback for unbuilt module tabs in Phase 1 */}
              <Route
                path="*"
                element={
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--admin-gold)' }}>
                      Module Scheduled for Next Phase
                    </h2>
                    <p style={{ color: 'var(--admin-text-secondary)', marginTop: '8px' }}>
                      This administrative module is scheduled for implementation in the next phase of the roadmap.
                    </p>
                  </div>
                }
              />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
}

export default App;
