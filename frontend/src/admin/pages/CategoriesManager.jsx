import { useState } from 'react';
import useSWR from 'swr';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import adminApi from '../services/adminApi';
import { Drawer, MigrationNotice, SkeletonRows, errorMessage, useToast } from '../components/AdminUi';

const fetcher = (url) => adminApi.get(url).then((r) => r.data);
const isEditable = (c) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(c.id || ''));
const EMPTY = { name: '', slug: '', description: '', image: '', sortOrder: 0, isActive: true, showOnHome: true };

function CategoryForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description,
      image: form.image.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
      showOnHome: form.showOnHome,
    };
    try {
      if (initial?.id) await adminApi.put(`/categories/${initial.id}`, payload);
      else await adminApi.post('/categories', payload);
      onSaved(`Category "${payload.name}" saved`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer title={initial ? `Edit ${initial.name}` : 'New category'} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        {error && <div className="admin-alert admin-alert-danger">{error}</div>}
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="cat-name">Name</label>
          <input id="cat-name" className="admin-input" required minLength={2} maxLength={60} value={form.name} onChange={set('name')} />
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="cat-slug">URL slug (auto from name if empty)</label>
          <input id="cat-slug" className="admin-input" maxLength={60} value={form.slug} onChange={set('slug')} placeholder="e.g. bridal-juttis" />
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="cat-desc">Description</label>
          <textarea id="cat-desc" className="admin-textarea" rows={3} maxLength={300} value={form.description} onChange={set('description')} />
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="cat-img">Image URL</label>
          <input id="cat-img" className="admin-input" maxLength={500} value={form.image} onChange={set('image')} placeholder="/images/category.jpg or https://…" />
          {form.image && <img src={form.image} alt="" style={{ marginTop: 8, width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />}
        </div>
        <div className="admin-form-group">
          <label className="admin-label" htmlFor="cat-sort">Sort order (lower shows first)</label>
          <input id="cat-sort" type="number" className="admin-input" value={form.sortOrder} onChange={set('sortOrder')} />
        </div>
        <label className="am-check"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Visible in store</label>
        <label className="am-check"><input type="checkbox" checked={form.showOnHome} onChange={set('showOnHome')} /> Show on homepage</label>
        <div className="am-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-btn admin-btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Save category'}</button>
        </div>
      </form>
    </Drawer>
  );
}

export default function CategoriesManager() {
  const { data, error, isLoading, mutate } = useSWR('/categories', fetcher);
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const categories = data?.categories || [];

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await adminApi.delete(`/categories/${c.id}`);
      toast.show(`Category "${c.name}" deleted`);
      mutate();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    }
  };

  const migration = categories.some((c) => !isEditable(c)) ? 'These are the default categories. Run the database migration in Store Settings to make them editable.' : '';

  return (
    <div className="am-page">
      <div className="am-header">
        <div>
          <h1 className="am-title">Product Categories</h1>
          <p className="am-subtitle">Categories drive the shop filters, homepage tiles and product form.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-gold" onClick={() => setEditing('new')}>
          <FiPlus size={14} /> New category
        </button>
      </div>

      <MigrationNotice message={migration} />
      {error && <div className="admin-alert admin-alert-danger">{errorMessage(error)}</div>}

      <div className="admin-card">
        {isLoading ? (
          <SkeletonRows />
        ) : categories.length === 0 ? (
          <p className="am-empty">No categories yet.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Category</th><th>Slug</th><th>Products</th><th>Order</th><th>Visibility</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {categories.map((c, i) => (
                  <tr key={c.id || c.slug} className="am-table-row" style={{ animationDelay: `${i * 0.03}s` }}>
                    <td>
                      <div className="am-item-line">
                        {c.image && <img src={c.image} alt="" />}
                        <div>
                          <strong>{c.name}</strong>
                          {c.description && <div className="am-muted">{c.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="am-muted">{c.slug}</td>
                    <td>{c.productCount}</td>
                    <td>{c.sortOrder}</td>
                    <td>
                      <span className={`admin-badge ${c.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>{c.isActive ? 'Visible' : 'Hidden'}</span>
                      {c.showOnHome && <span className="admin-badge admin-badge-gold" style={{ marginLeft: 6 }}>Home</span>}
                    </td>
                    <td>
                      {isEditable(c) && (
                        <div className="am-actions">
                          <button type="button" className="am-icon-btn" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><FiEdit2 size={14} /></button>
                          <button type="button" className="am-icon-btn" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><FiTrash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <CategoryForm
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
