import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiDownload,
  FiUpload,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiCopy,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiCheckSquare,
  FiSquare,
} from 'react-icons/fi';
import adminApi from '../services/adminApi';
import { ADMIN_PATH } from '../config/adminConfig';
import './ProductsList.css';

const ProductsList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Delete modal state
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (stockFilter !== 'all') params.append('stockFilter', stockFilter);
      if (sortBy) params.append('sort', sortBy);

      const res = await adminApi.get(`/products?${params.toString()}`);
      setProducts(res.data.products || []);
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load products:', err.message);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, stockFilter, sortBy]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // Bulk select toggles
  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p._id));
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk action handler
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      await adminApi.post('/products/bulk', { action, productIds: selectedIds });
      fetchProducts(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk operation failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Single action: toggle status
  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      await adminApi.patch(`/products/${product._id}/status`, { status: newStatus });
      setProducts(products.map((p) => (p._id === product._id ? { ...p, status: newStatus } : p)));
    } catch (err) {
      alert('Status change failed');
    }
  };

  // Single action: duplicate
  const handleDuplicate = async (product) => {
    try {
      const res = await adminApi.post(`/products/${product._id}/duplicate`);
      alert(`Duplicated: ${res.data.product?.name}`);
      fetchProducts(1);
    } catch (err) {
      alert('Duplicate failed');
    }
  };

  // Single action: delete
  const handleDeleteConfirm = async () => {
    if (!deleteModalProduct) return;
    try {
      await adminApi.delete(`/products/${deleteModalProduct._id}`);
      setDeleteModalProduct(null);
      fetchProducts(pagination.page);
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open('/api/admin/products/export/csv', '_blank');
  };

  return (
    <div className="admin-products-page">
      {/* Top action header */}
      <div className="admin-products-header">
        <div>
          <h1 className="admin-page-title">Product Catalog</h1>
          <p className="admin-page-subtitle">
            Manage your handcrafted jutti inventory, variants, prices, and catalog status.
          </p>
        </div>

        <div className="admin-header-actions">
          <button className="admin-btn admin-btn-secondary" onClick={handleExportCSV}>
            <FiDownload size={15} />
            <span>Export CSV</span>
          </button>
          <Link to={`${ADMIN_PATH}/products/new`} className="admin-btn admin-btn-primary">
            <FiPlus size={16} />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card admin-filter-card">
        <div className="admin-filter-row">
          <div className="admin-search-box">
            <FiSearch className="admin-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search by product name, SKU, or slug..."
              className="admin-input admin-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="admin-select-wrapper">
            <select
              className="admin-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="bridal">Bridal Collection</option>
              <option value="festive">Festive Collection</option>
              <option value="everyday">Everyday Chic</option>
              <option value="designer">Designer Art</option>
            </select>
          </div>

          <div className="admin-select-wrapper">
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>

          <div className="admin-select-wrapper">
            <select
              className="admin-select"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">All Inventory</option>
              <option value="low">Low Stock (≤ 5)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => fetchProducts(pagination.page)}
            title="Refresh list"
          >
            <FiRefreshCw className={loading ? 'spin' : ''} size={15} />
          </button>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div className="admin-bulk-toolbar">
            <div className="admin-bulk-count">
              <FiCheckSquare size={16} color="var(--admin-gold)" />
              <span>{selectedIds.length} item(s) selected</span>
            </div>

            <div className="admin-bulk-actions">
              <button
                className="admin-btn admin-btn-secondary"
                disabled={bulkActionLoading}
                onClick={() => handleBulkAction('publish')}
              >
                Publish Selected
              </button>
              <button
                className="admin-btn admin-btn-secondary"
                disabled={bulkActionLoading}
                onClick={() => handleBulkAction('unpublish')}
              >
                Set to Draft
              </button>
              <button
                className="admin-btn admin-btn-danger"
                disabled={bulkActionLoading}
                onClick={() => handleBulkAction('delete')}
              >
                Delete Selected
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setSelectedIds([])}
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Data Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="admin-checkbox-btn"
                    onClick={handleSelectAll}
                    title="Select all"
                  >
                    {products.length > 0 && selectedIds.length === products.length ? (
                      <FiCheckSquare size={16} color="var(--admin-gold)" />
                    ) : (
                      <FiSquare size={16} />
                    )}
                  </button>
                </th>
                <th style={{ width: '60px' }}>Image</th>
                <th>Product &amp; SKU</th>
                <th>Category</th>
                <th>Price (INR)</th>
                <th>Stock Units</th>
                <th>Status</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px' }}>
                    Loading catalog items...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px', color: 'var(--admin-text-muted)' }}>
                    No products found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isSelected = selectedIds.includes(product._id);
                  const isLowStock = (product.stockQuantity || 0) <= (product.lowStockThreshold || 5);
                  const isOut = (product.stockQuantity || 0) === 0;

                  return (
                    <tr key={product._id} className={isSelected ? 'admin-row-selected' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="admin-checkbox-btn"
                          onClick={() => handleToggleSelect(product._id)}
                        >
                          {isSelected ? (
                            <FiCheckSquare size={16} color="var(--admin-gold)" />
                          ) : (
                            <FiSquare size={16} />
                          )}
                        </button>
                      </td>
                      <td>
                        <img
                          src={product.image || '/images/hero_banner.jpg'}
                          alt={product.name}
                          className="admin-product-thumb"
                          onError={(e) => { e.target.src = '/favicon.svg'; }}
                        />
                      </td>
                      <td>
                        <div className="admin-product-meta-cell">
                          <Link to={`${ADMIN_PATH}/products/${product._id}/edit`} className="admin-product-name-link">
                            {product.name}
                          </Link>
                          <div className="admin-product-sku-row">
                            <span className="admin-sku-pill">{product.sku || 'NO-SKU'}</span>
                            <span className="admin-slug-text">/{product.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-gold">
                          {product.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--admin-cream)' }}>
                          ₹{product.price?.toLocaleString()}
                        </div>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', textDecoration: 'line-through' }}>
                            ₹{product.originalPrice?.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="admin-stock-cell">
                          <span
                            className={`admin-stock-indicator ${
                              isOut ? 'stock-out' : isLowStock ? 'stock-low' : 'stock-ok'
                            }`}
                          />
                          <span style={{ fontWeight: 600 }}>{product.stockQuantity || 0} pairs</span>
                          {isOut ? (
                            <span className="admin-stock-sub out">Out of stock</span>
                          ) : isLowStock ? (
                            <span className="admin-stock-sub low">Low stock</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            product.status === 'published' ? 'admin-badge-success' : 'admin-badge-warning'
                          }`}
                        >
                          {product.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions-cell">
                          <button
                            type="button"
                            className="admin-action-icon-btn"
                            title={product.status === 'published' ? 'Unpublish to Draft' : 'Publish to Store'}
                            onClick={() => handleToggleStatus(product)}
                          >
                            {product.status === 'published' ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                          </button>
                          <button
                            type="button"
                            className="admin-action-icon-btn"
                            title="Duplicate Product"
                            onClick={() => handleDuplicate(product)}
                          >
                            <FiCopy size={15} />
                          </button>
                          <Link
                            to={`${ADMIN_PATH}/products/${product._id}/edit`}
                            className="admin-action-icon-btn"
                            title="Edit Product"
                          >
                            <FiEdit2 size={15} />
                          </Link>
                          <button
                            type="button"
                            className="admin-action-icon-btn delete"
                            title="Delete Product"
                            onClick={() => setDeleteModalProduct(product)}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="admin-table-footer">
          <div>
            Showing {products.length} of {pagination.total} catalog items
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="admin-btn admin-btn-secondary"
              style={{ padding: '6px 12px' }}
              disabled={pagination.page <= 1}
              onClick={() => fetchProducts(pagination.page - 1)}
            >
              <FiChevronLeft />
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              className="admin-btn admin-btn-secondary"
              style={{ padding: '6px 12px' }}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchProducts(pagination.page + 1)}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalProduct && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-box">
            <h3 style={{ color: '#EF4444' }}>Soft-Delete Product</h3>
            <p>
              Are you sure you want to remove <strong>{deleteModalProduct.name}</strong> (SKU:{' '}
              {deleteModalProduct.sku})?
            </p>
            <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              Note: This action is a safe soft-delete. The product will be hidden from the public store, but its historical
              orders and sales reports will remain intact.
            </p>
            <div className="admin-modal-actions">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setDeleteModalProduct(null)}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={handleDeleteConfirm}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsList;
