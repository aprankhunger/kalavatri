import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerLayout from './components/CustomerLayout';
import Home from './pages/Home';

// Customer pages (code-split: only loaded when their route is visited)
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const NotFound = lazy(() => import('./pages/NotFound'));

import { AdminAuthProvider } from './admin/context/AdminAuthContext';
import { ADMIN_PATH } from './admin/config/adminConfig';
import AdminProtectedRoute from './admin/components/AdminProtectedRoute';

// Admin area (code-split: the entire /admin subtree is kept out of the
// customer bundle and only downloaded when an admin route is visited)
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminLogin = lazy(() => import('./admin/pages/AdminLogin'));
const Dashboard = lazy(() => import('./admin/pages/Dashboard'));
const AuditLogs = lazy(() => import('./admin/pages/AuditLogs'));
const ProductsList = lazy(() => import('./admin/pages/ProductsList'));
const ProductForm = lazy(() => import('./admin/pages/ProductForm'));
const InventoryManager = lazy(() => import('./admin/pages/InventoryManager'));
const OrdersManager = lazy(() => import('./admin/pages/OrdersManager'));
const CustomersList = lazy(() => import('./admin/pages/CustomersList'));
const CouponsManager = lazy(() => import('./admin/pages/CouponsManager'));
const CategoriesManager = lazy(() => import('./admin/pages/CategoriesManager'));
const ContentManager = lazy(() => import('./admin/pages/ContentManager'));
const StoreSettings = lazy(() => import('./admin/pages/StoreSettings'));
const StaffManager = lazy(() => import('./admin/pages/StaffManager'));

import ScrollToTop from './components/ScrollToTop';

import './App.css';

function App() {
  return (
    <AdminAuthProvider>
      <Router>
        <ScrollToTop />
        <Suspense fallback={null}>
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
        </Suspense>
      </Router>
    </AdminAuthProvider>
  );
}

export default App;
