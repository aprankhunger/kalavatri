import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerLayout from './components/CustomerLayout';
import Home from './pages/Home';
import Shop from './pages/Shop';
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
import OrdersManager from './admin/pages/OrdersManager';
import CustomersList from './admin/pages/CustomersList';
import CouponsManager from './admin/pages/CouponsManager';
import CategoriesManager from './admin/pages/CategoriesManager';
import ContentManager from './admin/pages/ContentManager';
import StoreSettings from './admin/pages/StoreSettings';
import StaffManager from './admin/pages/StaffManager';

import './App.css';

function App() {
  return (
    <AdminAuthProvider>
      <Router>
        <Routes>
          {/* Secret Obfuscated Admin Portal Routes */}
          <Route path={`${ADMIN_PATH}/login`} element={<AdminLogin />} />

          <Route path={ADMIN_PATH} element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to={`${ADMIN_PATH}/dashboard`} replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<ProductsList />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id/edit" element={<ProductForm />} />
              <Route path="categories" element={<CategoriesManager />} />
              <Route path="inventory" element={<InventoryManager />} />
              <Route path="orders" element={<OrdersManager />} />
              <Route path="customers" element={<CustomersList />} />
              <Route path="coupons" element={<CouponsManager />} />
              <Route path="content" element={<ContentManager />} />
              <Route path="staff" element={<StaffManager />} />
              <Route path="settings" element={<StoreSettings />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="*" element={<Navigate to={`${ADMIN_PATH}/dashboard`} replace />} />
            </Route>
          </Route>

          {/* Public Customer Storefront Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
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
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
}

export default App;
