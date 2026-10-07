import { useState } from 'react';
import useSWR from 'swr';
import { FiPlus, FiEdit2 } from 'react-icons/fi';
import adminApi from '../services/adminApi';
import { ADMIN_ROLE_LABELS } from '../config/adminConfig';
import { Drawer, SkeletonRows, errorMessage, formatDate, useToast } from '../components/AdminUi';

const fetcher = (url) => adminApi.get(url).then((r) => r.data);

function StaffForm({ initial, roles, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    role: initial?.role || roles[1] || roles[0],
    isActive: initial?.isActive ?? true,
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (initial) {
        const payload = { name: form.name, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await adminApi.patch(`/staff/${initial.id}`, payload);
      } else {
        await adminApi.post('/staff', { name: form.name, email: form.email, role: form.role, password: form.password });
      }
      onSaved(`${form.name} saved`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer title={initial ? `Edit ${initial.name}` : 'Invite staff member'} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        {error && <div className="admin-alert admin-alert-danger">{error}</div>}
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="st-name">Name</label>
          <input id="st-name" className="admin-input" required minLength={2} value={form.name} onChange={set('name')} />
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="st-email">Email</label>
          <input id="st-email" type="email" className="admin-input" required disabled={!!initial} value={form.email} onChange={set('email')} />
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="st-role">Role</label>
          <select id="st-role" className="admin-select" value={form.role} onChange={set('role')}>
            {roles.map((r) => <option key={r} value={r}>{ADMIN_ROLE_LABELS[r] || r}</option>)}
          </select>
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="st-pass">{initial ? 'New password (leave empty to keep)' : 'Temporary password'}</label>
          <input id="st-pass" type="password" autoComplete="new-password" className="admin-input" required={!initial} minLength={12} value={form.password} onChange={set('password')} />
          <span className="am-muted">12+ characters with upper, lower, number and symbol.</span>
        </div>
        {initial && <label className="am-check"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Account active</label>}
        <div className="am-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-btn admin-btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Drawer>
  );
}

export default function StaffManager() {
  const { data, error, isLoading, mutate } = useSWR('/staff', fetcher);
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const staff = data?.staff || [];
  const roles = data?.roles || Object.keys(ADMIN_ROLE_LABELS);

  return (
    <div className="am-page">
      <div className="am-header">
        <div>
          <h1 className="am-title">Staff Management</h1>
          <p className="am-subtitle">Control who can access the admin portal and what they can do.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-gold" onClick={() => setEditing('new')}><FiPlus size={14} /> Add staff</button>
      </div>

      {error && <div className="admin-alert admin-alert-danger">{errorMessage(error)}</div>}

      <div className="admin-card">
        {isLoading ? (
          <SkeletonRows />
        ) : staff.length === 0 ? (
          <p className="am-empty">No staff accounts found.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last login</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {staff.map((s, i) => (
                  <tr key={s.id} className="am-table-row" style={{ animationDelay: `${i * 0.03}s` }}>
                    <td>{s.name}<div className="am-muted">{s.email}</div></td>
                    <td>{ADMIN_ROLE_LABELS[s.role] || s.role}</td>
                    <td><span className={`admin-badge ${s.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>{s.isActive ? 'Active' : 'Disabled'}</span></td>
                    <td className="am-muted">{formatDate(s.lastLoginAt)}</td>
                    <td><button type="button" className="am-icon-btn" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><FiEdit2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <StaffForm
          initial={editing === 'new' ? null : editing}
          roles={roles}
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
