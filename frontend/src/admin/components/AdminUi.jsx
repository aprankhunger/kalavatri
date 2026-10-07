import { useCallback, useEffect, useRef, useState } from 'react';
import { FiX } from 'react-icons/fi';
import '../styles/modules.css';

export const errorMessage = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;

export const formatINR = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const show = useCallback((message, type = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const node = toast ? (
    <div className={`am-toast am-toast-${toast.type}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  ) : null;

  return { show, node };
}

export function Drawer({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="am-drawer-backdrop" onClick={onClose}>
      <aside
        className="am-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="am-drawer-header">
          <h2 className="am-title" style={{ fontSize: '1.25rem' }}>{title}</h2>
          <button type="button" className="am-icon-btn" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function SkeletonRows({ count = 5 }) {
  return (
    <div className="am-skeleton-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="am-skeleton" style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

export function MigrationNotice({ message }) {
  if (!message) return null;
  return (
    <div className="admin-alert admin-alert-warning" role="alert">
      {message}
    </div>
  );
}
