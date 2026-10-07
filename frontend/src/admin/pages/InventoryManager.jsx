import { useState, useEffect, useCallback } from 'react';
import {
  FiPackage,
  FiDollarSign,
  FiAlertTriangle,
  FiXCircle,
  FiRefreshCw,
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiArrowUp,
  FiArrowDown,
} from 'react-icons/fi';
import adminApi from '../services/adminApi';
import './InventoryManager.css';

const InventoryManager = () => {
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Adjustment Modal Form State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityChange, setQuantityChange] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, movRes] = await Promise.all([
        adminApi.get('/inventory/summary'),
        adminApi.get('/inventory/movements?limit=25'),
      ]);
      setSummary(sumRes.data);
      setMovements(movRes.data.movements || []);
    } catch (err) {
      console.error('Failed to load inventory data:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const handleOpenAdjustModal = (item) => {
    setSelectedProduct(item);
    setQuantityChange('');
    setReason('');
    setActionError(null);
    setModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !quantityChange || !reason) return;
    setSubmitting(true);
    setActionError(null);

    try {
      await adminApi.post('/inventory/adjust', {
        productId: selectedProduct.id || selectedProduct._id,
        quantityChange: Number(quantityChange),
        reason,
      });
      setModalOpen(false);
      fetchInventoryData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-inventory-page">
      {/* Page Header */}
      <div className="admin-inventory-header">
        <div>
          <h1 className="admin-page-title">Live Inventory &amp; Stock Movements</h1>
          <p className="admin-page-subtitle">
            Real-time stock valuation, low-inventory alerts, and immutable restock audit logs.
          </p>
        </div>

        <button
          className="admin-btn admin-btn-secondary"
          onClick={fetchInventoryData}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} size={15} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="admin-inventory-kpis">
        <div className="admin-card admin-kpi-card">
          <div className="admin-kpi-icon icon-gold">
            <FiPackage size={24} />
          </div>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Total Stock Units</span>
            <div className="admin-kpi-value">{summary?.totalUnits?.toLocaleString() || 0} pairs</div>
            <span className="admin-kpi-sub">Across {summary?.totalProducts || 0} active models</span>
          </div>
        </div>

        <div className="admin-card admin-kpi-card">
          <div className="admin-kpi-icon icon-maroon">
            <FiDollarSign size={24} />
          </div>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Inventory Valuation (Cost)</span>
            <div className="admin-kpi-value">₹{summary?.totalValuation?.toLocaleString() || 0}</div>
            <span className="admin-kpi-sub">At workshop craft cost</span>
          </div>
        </div>

        <div className="admin-card admin-kpi-card">
          <div className="admin-kpi-icon icon-yellow">
            <FiAlertTriangle size={24} />
          </div>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Low Stock Alerts</span>
            <div className="admin-kpi-value" style={{ color: '#F59E0B' }}>
              {summary?.lowStockCount || 0}
            </div>
            <span className="admin-kpi-sub">≤ 5 units remaining</span>
          </div>
        </div>

        <div className="admin-card admin-kpi-card">
          <div className="admin-kpi-icon icon-red">
            <FiXCircle size={24} />
          </div>
          <div className="admin-kpi-info">
            <span className="admin-kpi-label">Out of Stock</span>
            <div className="admin-kpi-value" style={{ color: '#EF4444' }}>
              {summary?.outOfStockCount || 0}
            </div>
            <span className="admin-kpi-sub">Need workshop reorder</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      {summary?.lowStockItems && summary.lowStockItems.length > 0 && (
        <div className="admin-card" style={{ marginBottom: '28px' }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <FiAlertTriangle color="#F59E0B" /> Low Stock Warning List
            </h3>
            <span className="admin-badge admin-badge-warning">
              {summary.lowStockItems.length} Products Require Attention
            </span>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Thumbnail</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Remaining Stock</th>
                  <th>Alert Threshold</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {summary.lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <img
                        src={item.image || '/images/hero_banner.jpg'}
                        alt={item.name}
                        className="admin-product-thumb"
                        onError={(e) => { e.target.src = '/favicon.svg'; }}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--admin-cream)' }}>{item.name}</td>
                    <td>
                      <span className="admin-sku-pill">{item.sku}</span>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-warning">{item.stock} pairs</span>
                    </td>
                    <td>{item.threshold} pairs</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="admin-btn admin-btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => handleOpenAdjustModal(item)}
                      >
                        Adjust / Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Movements Audit Trail */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-border)' }}>
          <h3 className="admin-card-title">
            <FiClock color="var(--admin-gold)" /> Immutable Stock Movement History
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', margin: '4px 0 0' }}>
            Logged automatically on admin restocks, workshop additions, and customer order deductions.
          </p>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '170px' }}>Timestamp</th>
                <th>Product &amp; SKU</th>
                <th>Movement Type</th>
                <th>Change</th>
                <th>Prior &rarr; New Stock</th>
                <th>Reason</th>
                <th>Staff Recorded</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>
                    No stock movements recorded yet. Movements will appear as orders are processed or stock is adjusted.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--admin-cream)' }}>{m.productName}</div>
                      <span className="admin-sku-pill">{m.sku}</span>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-gold">{m.type}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: m.quantityChange > 0 ? '#10B981' : '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {m.quantityChange > 0 ? <FiArrowUp /> : <FiArrowDown />}
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {m.previousStock} &rarr; <strong>{m.newStock}</strong>
                    </td>
                    <td style={{ fontSize: '13px' }}>{m.reason}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                      {m.adminEmail}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {modalOpen && selectedProduct && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-box">
            <h3>Adjust Stock: {selectedProduct.name}</h3>
            <p>
              Current Stock: <strong>{selectedProduct.stock ?? selectedProduct.stockQuantity} pairs</strong> (SKU:{' '}
              {selectedProduct.sku})
            </p>

            {actionError && (
              <div className="admin-alert admin-alert-danger">
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit}>
              <div className="admin-form-group">
                <label className="admin-label">
                  Stock Change (e.g. +10 for new shipment, -2 for workshop damage)
                </label>
                <input
                  type="number"
                  placeholder="+10 or -2"
                  className="admin-input"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Adjustment Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Received new shipment of 10 pairs from workshop"
                  className="admin-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={submitting || !quantityChange || !reason}
                >
                  {submitting ? 'Updating...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
