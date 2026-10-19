// Common reusable components

// ---------- StatusBadge ----------
export function StatusBadge({ risk }) {
  const map = {
    EXPIRED: { cls: 'badge-danger', label: 'EXPIRED' },
    HIGH: { cls: 'badge-danger', label: 'HIGH' },
    MEDIUM: { cls: 'badge-warning', label: 'MEDIUM' },
    LOW: { cls: 'badge-success', label: 'LOW' },
    ACTIVE: { cls: 'badge-success', label: 'Active' },
    INACTIVE: { cls: 'badge-neutral', label: 'Inactive' },
    REORDER: { cls: 'badge-danger', label: 'Reorder' },
    SUFFICIENT: { cls: 'badge-success', label: 'Sufficient' },
    'PRIORITIZE EXPIRING STOCK': { cls: 'badge-warning', label: 'Prioritize Expiry' },
    'PRIORITIZE EXPIRING STOCK + REORDER': { cls: 'badge-danger', label: 'Expiry + Reorder' },
  };
  const info = map[risk] || { cls: 'badge-neutral', label: risk };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

// ---------- LoadingState ----------
export function LoadingState({ text = 'Loading data...' }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{text}</span>
    </div>
  );
}

// ---------- SkeletonCards ----------
export function SkeletonCards({ count = 6 }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

// ---------- EmptyState ----------
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {Icon && <Icon size={28} />}
      </div>
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
      {action}
    </div>
  );
}

// ---------- ErrorState ----------
export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-state-icon" style={{ fontSize: 32 }}>⚠️</div>
      <div className="error-state-title">Connection Error</div>
      <div className="error-state-text">
        {message || 'Unable to connect to the inventory server. Please check that the backend is running.'}
      </div>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

// ---------- Pagination ----------
export function Pagination({ page, totalPages, onPage, totalItems, pageSize }) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {start}–{end} of {totalItems} records
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>‹</button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum;
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (page <= 4) {
            pageNum = i + 1;
          } else if (page >= totalPages - 3) {
            pageNum = totalPages - 6 + i;
          } else {
            pageNum = page - 3 + i;
          }
          return (
            <button
              key={pageNum}
              className={`page-btn ${pageNum === page ? 'active' : ''}`}
              onClick={() => onPage(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</button>
      </div>
    </div>
  );
}

// ---------- ConfirmDialog ----------
export function ConfirmDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: 'var(--spacing-6)' }}>
          <div className="confirm-icon">
            <span style={{ fontSize: 22 }}>🗑️</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{title}</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{message}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- KpiCard ----------
export function KpiCard({ icon: Icon, value, label, support, color = 'green', trend }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-top">
        <div className={`kpi-icon ${color}`}>
          {Icon && <Icon size={20} />}
        </div>
        {trend && <span className="kpi-trend">{trend}</span>}
      </div>
      <div className="kpi-value">{value ?? '—'}</div>
      <div className="kpi-label">{label}</div>
      {support && <div className="kpi-support">{support}</div>}
    </div>
  );
}

// ---------- ChartCard ----------
export function ChartCard({ title, subtitle, children, actions, style }) {
  return (
    <div className="chart-card" style={style}>
      <div className="chart-header">
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}
