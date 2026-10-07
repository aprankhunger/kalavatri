import { useState } from 'react';
import useSWR from 'swr';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';
import adminApi from '../services/adminApi';
import { Drawer, SkeletonRows, errorMessage, formatDate, formatINR, useToast } from '../components/AdminUi';

const ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const STATUS_BADGE = {
  placed: 'admin-badge-warning',
  confirmed: 'admin-badge-gold',
  processing: 'admin-badge-gold',
  shipped: 'admin-badge-gold',
  delivered: 'admin-badge-success',
  cancelled: 'admin-badge-danger',
  returned: 'admin-badge-danger',
  pending: 'admin-badge-warning',
  paid: 'admin-badge-success',
  failed: 'admin-badge-danger',
  refunded: 'admin-badge-danger',
};

const fetcher = (url) => adminApi.get(url).then((r) => r.data);

function OrderDetail({ order, onClose, onSaved }) {
  const [form, setForm] = useState({
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber || '',
    courierName: order.courierName || '',
    notes: order.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminApi.patch(`/orders/${order.id}`, form);
      onSaved(`Order ${order.orderNumber} updated`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const a = order.shippingAddress || {};

  return (
    <Drawer title={`Order ${order.orderNumber}`} onClose={onClose}>
      <p className="am-muted">Placed {formatDate(order.createdAt)}</p>

      <section className="admin-card">
        <h3 className="admin-card-title">Customer</h3>
        <p>{order.customer?.name}</p>
        <p className="am-muted">{order.customer?.email} · {order.customer?.phone}</p>
        <p className="am-muted" style={{ marginTop: 8 }}>
          {[a.addressLine1, a.addressLine2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ')}
        </p>
      </section>

      <section className="admin-card">
        <h3 className="admin-card-title">Items</h3>
        <div className="am-items-list">
          {(order.items || []).map((item, i) => (
            <div key={i} className="am-item-line">
              {item.image && <img src={item.image} alt="" />}
              <div style={{ flex: 1 }}>
                <div>{item.name}</div>
                <div className="am-muted">
                  Qty {item.quantity}
                  {item.size ? ` · Size ${item.size}` : ''}
                  {item.color ? ` · ${item.color}` : ''}
                </div>
              </div>
              <strong>{formatINR(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>
        <div className="am-muted" style={{ marginTop: 12, display: 'grid', gap: 4 }}>
          <span>Subtotal: {formatINR(order.subtotal)}</span>
          <span>Delivery: {formatINR(order.deliveryFee)}</span>
          {order.discount > 0 && <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}: -{formatINR(order.discount)}</span>}
          <strong style={{ color: 'var(--admin-gold)' }}>Total: {formatINR(order.totalAmount)}</strong>
        </div>
      </section>

      <form onSubmit={save} className="admin-card" style={{ display: 'grid', gap: 12 }}>
        <h3 className="admin-card-title">Fulfilment</h3>
        {error && <div className="admin-alert admin-alert-danger">{error}</div>}
        <div className="am-row">
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="o-status">Order status</label>
            <select id="o-status" className="admin-select" value={form.orderStatus} onChange={set('orderStatus')}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="o-pay">Payment status</label>
            <select id="o-pay" className="admin-select" value={form.paymentStatus} onChange={set('paymentStatus')}>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="am-row">
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="o-courier">Courier</label>
            <input id="o-courier" className="admin-input" value={form.courierName} onChange={set('courierName')} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="o-track">Tracking number</label>
            <input id="o-track" className="admin-input" value={form.trackingNumber} onChange={set('trackingNumber')} />
          </div>
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="o-notes">Internal notes</label>
          <textarea id="o-notes" className="admin-textarea" rows={3} value={form.notes} onChange={set('notes')} />
        </div>
        <div className="am-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Close</button>
          <button type="submit" className="admin-btn admin-btn-gold" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

export default function OrdersManager() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) params.set('status', status);
  if (payment) params.set('payment', payment);
  if (query) params.set('search', query);

  const { data, error, isLoading, mutate } = useSWR(`/orders?${params}`, fetcher, { keepPreviousData: true });
  const orders = data?.orders || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

  return (
    <div className="am-page">
      <div className="am-header">
        <div>
          <h1 className="am-title">Orders & Fulfillment</h1>
          <p className="am-subtitle">{pagination.total} orders · update status, payment and tracking</p>
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => mutate()}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      <form className="am-toolbar" onSubmit={onSearch} role="search">
        <label htmlFor="order-search" className="sr-only">Search orders</label>
        <input
          id="order-search"
          className="admin-input"
          placeholder="Order #, name, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn admin-btn-primary"><FiSearch size={14} /> Search</button>
        <label htmlFor="order-status" className="sr-only">Order status</label>
        <select id="order-status" className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label htmlFor="order-payment" className="sr-only">Payment status</label>
        <select id="order-payment" className="admin-select" value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }}>
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </form>

      {error && <div className="admin-alert admin-alert-danger">{errorMessage(error)}</div>}

      <div className="admin-card">
        {isLoading && !data ? (
          <SkeletonRows />
        ) : orders.length === 0 ? (
          <p className="am-empty">No orders match these filters yet.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr
                    key={o.id}
                    className="am-table-row am-clickable"
                    style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={() => setSelected(o)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(o)}
                  >
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>
                      {o.customer?.name}
                      <div className="am-muted">{o.customer?.email}</div>
                    </td>
                    <td>{formatINR(o.totalAmount)}</td>
                    <td><span className={`admin-badge ${STATUS_BADGE[o.orderStatus] || ''}`}>{o.orderStatus}</span></td>
                    <td><span className={`admin-badge ${STATUS_BADGE[o.paymentStatus] || ''}`}>{o.paymentStatus}</span></td>
                    <td className="am-muted">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="am-pagination">
          <span className="am-muted">Page {pagination.page} of {pagination.pages}</span>
          <div className="am-actions">
            <button type="button" className="admin-btn admin-btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button type="button" className="admin-btn admin-btn-secondary" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onSaved={(msg) => {
            setSelected(null);
            toast.show(msg);
            mutate();
          }}
        />
      )}
      {toast.node}
    </div>
  );
}
