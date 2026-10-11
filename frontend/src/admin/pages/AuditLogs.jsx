import { useState, useEffect, useCallback } from 'react';
import {
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import adminApi from '../services/adminApi';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (actionFilter) params.append('action', actionFilter);
      if (resourceFilter) params.append('resource', resourceFilter);
      if (search) params.append('search', search);

      const res = await adminApi.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load audit logs:', err.message);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceFilter, search]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getActionBadgeClass = (action) => {
    if (action.includes('SUCCESS') || action.includes('ACTIVATED')) return 'admin-badge-success';
    if (action.includes('FAILED') || action.includes('BLOCKED')) return 'admin-badge-danger';
    if (action.includes('INITIATED')) return 'admin-badge-warning';
    return 'admin-badge-gold';
  };

  return (
    <div className="admin-audit-page">
      <div className="admin-card-header" style={{ border: 'none', padding: 0, marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: '0 0 6px' }}>Immutable Audit Trail</h1>
          <p style={{ color: 'var(--admin-text-secondary)', margin: 0, fontSize: '13px' }}>
            Append-only security logs of administrative activity, logins, 2FA modifications, and data edits.
          </p>
        </div>

        <button
          className="admin-btn admin-btn-secondary"
          onClick={() => fetchLogs(pagination.page)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="admin-card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              placeholder="Search by action, email, or IP..."
              className="admin-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="admin-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="LOGIN_SUCCESS_2FA">LOGIN_SUCCESS_2FA</option>
              <option value="2FA_ACTIVATED">2FA_ACTIVATED</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <select
              className="admin-select"
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
            >
              <option value="">All Resources</option>
              <option value="AUTH">AUTH</option>
              <option value="SYSTEM">SYSTEM</option>
              <option value="PRODUCTS">PRODUCTS</option>
              <option value="ORDERS">ORDERS</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Timestamp</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Actor Email</th>
                <th>Role</th>
                <th>IP Address</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)' }}>
                    No audit log records match the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log._id;
                  return (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className={`admin-badge ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ color: 'var(--admin-cream)', fontWeight: 500 }}>
                        {log.resource}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {log.adminEmail}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--admin-gold)' }}>
                        {log.role}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                        {log.ipAddress || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => toggleExpand(log._id)}
                        >
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Details Modal/Row */}
        {expandedLogId && (
          <div style={{
            padding: '16px 20px',
            background: 'var(--admin-bg-surface)',
            borderTop: '1px solid var(--admin-border)',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}>
            <strong style={{ color: 'var(--admin-gold)', display: 'block', marginBottom: '8px' }}>
              Payload Details for Log #{expandedLogId}:
            </strong>
            <pre style={{
              background: '#0D0A0A',
              padding: '12px',
              borderRadius: '6px',
              overflowX: 'auto',
              color: '#34D399',
            }}>
              {JSON.stringify(logs.find((l) => l._id === expandedLogId)?.details || {}, null, 2)}
            </pre>
          </div>
        )}

        {/* Pagination Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderTop: '1px solid var(--admin-border)',
          fontSize: '13px',
          color: 'var(--admin-text-muted)'
        }}>
          <div>
            Showing {logs.length} of {pagination.total} audit entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="admin-btn admin-btn-secondary"
              style={{ padding: '6px 12px' }}
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
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
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
