import { useEffect, useState } from 'react';
import useSWR from 'swr';
import adminApi from '../services/adminApi';
import { SkeletonRows, errorMessage, useToast } from '../components/AdminUi';

const fetcher = (url) => adminApi.get(url).then((r) => r.data);

export default function StoreSettings() {
  const { data: content, mutate } = useSWR('/content', fetcher);
  const { data: status, mutate: refreshStatus, isLoading: statusLoading } = useSWR('/system/status', fetcher);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (content?.store && !form) setForm(content.store);
  }, [content, form]);

  const set = (k, numeric) => (e) => setForm((f) => ({ ...f, [k]: numeric ? Number(e.target.value) : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await adminApi.put('/content/store', form);
      setForm(data.value);
      mutate();
      toast.show('Store settings saved');
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const copySql = async () => {
    await navigator.clipboard.writeText(status.migrationSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="am-page">
      <div className="am-header">
        <div>
          <h1 className="am-title">Store Settings</h1>
          <p className="am-subtitle">Shipping, order limits and database health.</p>
        </div>
      </div>

      <div className="am-grid am-grid-2">
        <form className="admin-card" onSubmit={save} style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <h2 className="admin-card-title">Shipping & checkout</h2>
          {!form ? (
            <SkeletonRows count={4} />
          ) : (
            <>
              <div className="am-row">
                <div className="admin-form-group">
                  <label className="admin-label" htmlFor="s-fee">Delivery fee (₹)</label>
                  <input id="s-fee" type="number" min="0" className="admin-input" value={form.deliveryFee} onChange={set('deliveryFee', true)} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label" htmlFor="s-free">Free shipping above (₹, 0 = never)</label>
                  <input id="s-free" type="number" min="0" className="admin-input" value={form.freeShippingThreshold} onChange={set('freeShippingThreshold', true)} />
                </div>
              </div>
              <div className="admin-form-group">
                <label className="admin-label" htmlFor="s-max">Max quantity per item</label>
                <input id="s-max" type="number" min="1" max="100" className="admin-input" value={form.maxQuantityPerItem} onChange={set('maxQuantityPerItem', true)} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label" htmlFor="s-note">Dispatch note (shown on product & checkout)</label>
                <textarea id="s-note" className="admin-textarea" rows={2} maxLength={300} value={form.dispatchNote} onChange={set('dispatchNote')} />
              </div>
              <div className="am-actions">
                <button type="submit" className="admin-btn admin-btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
              </div>
            </>
          )}
        </form>

        <section className="admin-card" style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div className="am-header">
            <h2 className="admin-card-title">Database</h2>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => refreshStatus()}>Re-check</button>
          </div>
          {statusLoading || !status ? (
            <SkeletonRows count={3} />
          ) : (
            <>
              <span className={`admin-badge ${status.databaseConnected ? 'admin-badge-success' : 'admin-badge-danger'}`} style={{ justifySelf: 'start' }}>
                {status.databaseConnected ? 'Supabase connected' : 'Database not configured'}
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                {Object.entries(status.tables || {}).map(([t, ok]) => (
                  <li key={t} className="am-muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t}</span>
                    <span className={`admin-badge ${ok ? 'admin-badge-success' : 'admin-badge-warning'}`}>{ok ? 'Ready' : 'Missing'}</span>
                  </li>
                ))}
              </ul>
              {status.migrationRequired && (
                <>
                  <div className="admin-alert admin-alert-warning">
                    Some tables are missing. Copy this SQL, paste it into the Supabase SQL Editor and run it once, then click Re-check.
                  </div>
                  <label htmlFor="migration-sql" className="sr-only">Migration SQL</label>
                  <textarea id="migration-sql" className="am-code" readOnly value={status.migrationSql} />
                  <button type="button" className="admin-btn admin-btn-primary" onClick={copySql}>{copied ? 'Copied!' : 'Copy SQL'}</button>
                </>
              )}
            </>
          )}
        </section>
      </div>
      {toast.node}
    </div>
  );
}
