import { useMemo, useState } from 'react';
import useSWR from 'swr';
import adminApi from '../services/adminApi';
import { SkeletonRows, errorMessage, formatDate, formatINR } from '../components/AdminUi';

const fetcher = (url) => adminApi.get(url).then((r) => r.data);

const toCsv = (rows) => {
  const header = ['Name', 'Email', 'Phone', 'City', 'State', 'Orders', 'Total Spent', 'Last Order'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [header, ...rows.map((c) => [c.name, c.email, c.phone, c.city, c.state, c.orderCount, c.totalSpent, c.lastOrderAt])]
    .map((r) => r.map(escape).join(','))
    .join('\n');
};

export default function CustomersList() {
  const [tab, setTab] = useState('customers');
  const [search, setSearch] = useState('');
  const { data, error, isLoading } = useSWR('/customers', fetcher);

  const customers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = data?.customers || [];
    if (!term) return list;
    return list.filter((c) => [c.name, c.email, c.phone, c.city].some((v) => (v || '').toLowerCase().includes(term)));
  }, [data, search]);

  const subscribers = data?.subscribers || [];

  const exportCsv = () => {
    const blob = new Blob([toCsv(customers)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kalavatri-customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="am-page">
      <div className="am-header">
        <div>
          <h1 className="am-title">Customers</h1>
          <p className="am-subtitle">{(data?.customers || []).length} customers · {subscribers.length} newsletter subscribers</p>
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={exportCsv} disabled={!customers.length}>
          Export CSV
        </button>
      </div>

      <div className="am-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'customers'} className={`am-tab ${tab === 'customers' ? 'am-tab-active' : ''}`} onClick={() => setTab('customers')}>Customers</button>
        <button type="button" role="tab" aria-selected={tab === 'subscribers'} className={`am-tab ${tab === 'subscribers' ? 'am-tab-active' : ''}`} onClick={() => setTab('subscribers')}>Subscribers</button>
      </div>

      {error && <div className="admin-alert admin-alert-danger">{errorMessage(error)}</div>}

      {tab === 'customers' ? (
        <div className="admin-card">
          <div className="am-toolbar" style={{ marginBottom: 12 }}>
            <label htmlFor="cust-search" className="sr-only">Search customers</label>
            <input id="cust-search" className="admin-input" placeholder="Search name, email, phone, city" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isLoading ? (
            <SkeletonRows />
          ) : customers.length === 0 ? (
            <p className="am-empty">No customers yet. They appear here after their first order.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr><th>Customer</th><th>Phone</th><th>Location</th><th>Orders</th><th>Spent</th><th>Last order</th></tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr key={c.email} className="am-table-row" style={{ animationDelay: `${i * 0.03}s` }}>
                      <td>{c.name}<div className="am-muted">{c.email}</div></td>
                      <td>{c.phone || '—'}</td>
                      <td>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>{c.orderCount}</td>
                      <td>{formatINR(c.totalSpent)}</td>
                      <td className="am-muted">{formatDate(c.lastOrderAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-card">
          {isLoading ? (
            <SkeletonRows />
          ) : subscribers.length === 0 ? (
            <p className="am-empty">No newsletter subscribers yet.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead><tr><th>Email</th><th>Subscribed</th></tr></thead>
                <tbody>
                  {subscribers.map((s, i) => (
                    <tr key={s.id || s.email} className="am-table-row" style={{ animationDelay: `${i * 0.03}s` }}>
                      <td>{s.email}</td>
                      <td className="am-muted">{formatDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
