import { useState } from 'react';
import useSWR from 'swr';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import adminApi from '../services/adminApi';
import { Drawer, MigrationNotice, SkeletonRows, errorMessage, formatDate, formatINR, useToast } from '../components/AdminUi';

const fetcher = (url) => adminApi.get(url).then((r) => r.data);

const EMPTY = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: '',
  usageLimit: '',
  perCustomerLimit: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

const toInputDate = (v) => (v ? new Date(v).toISOString().slice(0, 16) : '');
const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

const couponState = (c) => {
  if (!c.isActive) return { label: 'Disabled', cls: 'admin-badge-danger' };
  const now = Date.now();
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { label: 'Expired', cls: 'admin-badge-danger' };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: 'Scheduled', cls: 'admin-badge-warning' };
  if (c.usageLimit && c.usedCount >= c.usageLimit) return { label: 'Limit reached', cls: 'admin-badge-warning' };
  return { label: 'Active', cls: 'admin-badge-success' };
};

function CouponForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...initial,
          maxDiscountAmount: initial.maxDiscountAmount ?? '',
          usageLimit: initial.usageLimit ?? '',
          perCustomerLimit: initial.perCustomerLimit ?? '',
          startsAt: toInputDate(initial.startsAt),
          expiresAt: toInputDate(initial.expiresAt),
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      code: form.code.trim(),
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxDiscountAmount: numOrNull(form.maxDiscountAmount),
      usageLimit: numOrNull(form.usageLimit),
      perCustomerLimit: numOrNull(form.perCustomerLimit),
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
    };
    try {
      if (initial) await adminApi.put(`/coupons/${initial.id}`, payload);
      else await adminApi.post('/coupons', payload);
      onSaved(`Coupon ${payload.code.toUpperCase()} saved`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer title={initial ? `Edit ${initial.code}` : 'New coupon'} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        {error && <div className="admin-alert admin-alert-danger">{error}</div>}
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="c-code">Code</label>
          <input id="c-code" className="admin-input" required minLength={3} maxLength={30} value={form.code} onChange={set('code')} style={{ textTransform: 'uppercase' }} />
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="c-desc">Description (shown to staff)</label>
          <input id="c-desc" className="admin-input" maxLength={200} value={form.description} onChange={set('description')} />
        </div>
        <div className="am-row">
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="c-type">Discount type</label>
            <select id="c-type" className="admin-select" value={form.discountType} onChange={set('discountType')}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (₹)</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="c-value">Value</label>
            <input id="c-value" type="number" min="1" max={form.discountType === 'percent' ? 100 : undefined} step="1" required className="admin-input" value={form.discountValue} onChange={set('discountValue')} />
          </div>
        </div>
        <div className="am-row">
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="c-min">Minimum order (₹)</label>
            <input id="c-min" type="number" min="0" className="admin-input" value={form.minOrderAmount} onChange={set('minOrderAmount')} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="c-max">Max discount (₹, optional)</label>
            <input id="c-max" type="number" min="1" className="admin-input" value={form.maxDiscountAmount} onChange={set('maxDiscountAmount')} />
          </div>
        </div>
        <div className="am-row">
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="c-limit">Total usage limit</label>
            <input id="c-limit" type="number" min="1" placeholder="Unlimited" className="admin-input" value={form.usageLimit} onChange={set('usageLimit')} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="c-per">Per customer limit</label>
            <input id="c-per" type="number" min="1" placeholder="Unlimited" className="admin-input" value={form.perCustomerLimit} onChange={set('perCustomerLimit')} />
          </div>
        </div>
        <div className="am-row">
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="c-start">Starts</label>
            <input id="c-start" type="datetime-local" className="admin-input" value={form.startsAt} onChange={set('startsAt')} />
          </div>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="c-end">Expires</label>
            <input id="c-end" type="datetime-local" className="admin-input" value={form.expiresAt} onChange={set('expiresAt')} />
          </div>
        </div>
        <label className="am-check">
          <input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Active
        </label>
        <div className="am-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-btn admin-btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Save coupon'}</button>
        </div>
      </form>
    </Drawer>
  );
}

export default function CouponsManager() {
  const { data, error, isLoading, mutate } = useSWR('/coupons', fetcher);
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const coupons = data?.coupons || [];
  const migration = error?.response?.data?.code === 'MIGRATION_REQUIRED' ? errorMessage(error) : '';

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    try {
      await adminApi.delete(`/coupons/${c.id}`);
      toast.show(`Coupon ${c.code} deleted`);
      mutate();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    }
  };

  const toggle = async (c) => {
    try {
      await adminApi.put(`/coupons/${c.id}`, { ...c, isActive: !c.isActive });
      toast.show(`${c.code} ${c.isActive ? 'disabled' : 'enabled'}`);
      mutate();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    }
  };

  return (
    <div className="am-page">
      <div className="am-header">
        <div>
          <h1 className="am-title">Coupons & Discounts</h1>
          <p className="am-subtitle">Set discounts, minimum order, usage limits and validity windows.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-gold" onClick={() => setEditing('new')}>
          <FiPlus size={14} /> New coupon
        </button>
      </div>

      <MigrationNotice message={migration} />
      {error && !migration && <div className="admin-alert admin-alert-danger">{errorMessage(error)}</div>}

      <div className="admin-card">
        {isLoading ? (
          <SkeletonRows />
        ) : coupons.length === 0 ? (
          <p className="am-empty">No coupons yet. Create one to offer discounts at checkout.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Code</th><th>Discount</th><th>Min order</th><th>Usage</th><th>Valid until</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {coupons.map((c, i) => {
                  const state = couponState(c);
                  return (
                    <tr key={c.id} className="am-table-row" style={{ animationDelay: `${i * 0.03}s` }}>
                      <td><strong>{c.code}</strong>{c.description && <div className="am-muted">{c.description}</div>}</td>
                      <td>
                        {c.discountType === 'percent' ? `${c.discountValue}%` : formatINR(c.discountValue)}
                        {c.maxDiscountAmount ? <div className="am-muted">up to {formatINR(c.maxDiscountAmount)}</div> : null}
                      </td>
                      <td>{c.minOrderAmount ? formatINR(c.minOrderAmount) : '—'}</td>
                      <td>
                        {c.usedCount} / {c.usageLimit ?? '∞'}
                        {c.perCustomerLimit ? <div className="am-muted">{c.perCustomerLimit} per customer</div> : null}
                      </td>
                      <td className="am-muted">{c.expiresAt ? formatDate(c.expiresAt) : 'No expiry'}</td>
                      <td>
                        <button type="button" className={`admin-badge ${state.cls}`} onClick={() => toggle(c)} title="Click to enable/disable" style={{ border: 'none', cursor: 'pointer' }}>
                          {state.label}
                        </button>
                      </td>
                      <td>
                        <div className="am-actions">
                          <button type="button" className="am-icon-btn" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}><FiEdit2 size={14} /></button>
                          <button type="button" className="am-icon-btn" onClick={() => remove(c)} aria-label={`Delete ${c.code}`}><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <CouponForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            toast.show(msg);
            mutate();
          }}
        />
      )}
      {toast.node}
    </div>
  );
}
