import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { expiryApi } from '../api/expiry';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../components/common';

const PAGE_SIZE = 20;

export default function ExpiryRisk() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [sortKey, setSortKey] = useState('days_remaining');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await expiryApi.getExpiryRisk();
      setData(res.data.expiry_risk || []);
    } catch (err) {
      setError(err.userMessage || 'Failed to load expiry risk data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const counts = {
    All: data.length,
    EXPIRED: data.filter(d => d.risk === 'EXPIRED').length,
    HIGH: data.filter(d => d.risk === 'HIGH').length,
    MEDIUM: data.filter(d => d.risk === 'MEDIUM').length,
    LOW: data.filter(d => d.risk === 'LOW').length,
  };

  const filtered = useMemo(() => {
    let list = filter === 'All' ? data : data.filter(d => d.risk === filter);
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data, filter, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : null;

  if (loading) return <LoadingState text="Loading expiry risk data..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, background: 'linear-gradient(135deg, #dc2626, #f97316)',
              borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={20} color="white" />
            </div>
            <div>
              <div className="page-title">Expiry Risk Monitor</div>
              <div className="page-subtitle">Track inventory batches approaching or past expiry dates</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid section-mb">
        {[
          {
            key: 'EXPIRED', label: 'Expired', count: counts.EXPIRED,
            bg: 'var(--color-danger-light)', border: 'var(--color-danger-border)',
            color: 'var(--color-danger)', desc: 'Past expiry date'
          },
          {
            key: 'HIGH', label: 'High Risk', count: counts.HIGH,
            bg: '#fff7ed', border: '#fed7aa',
            color: '#ea580c', desc: '≤ 3 days remaining'
          },
          {
            key: 'MEDIUM', label: 'Medium Risk', count: counts.MEDIUM,
            bg: 'var(--color-warning-light)', border: 'var(--color-warning-border)',
            color: 'var(--color-warning)', desc: '4–7 days remaining'
          },
          {
            key: 'LOW', label: 'Low Risk', count: counts.LOW,
            bg: 'var(--color-success-light)', border: 'var(--color-success-border)',
            color: 'var(--color-success)', desc: '> 7 days remaining'
          },
        ].map(({ key, label, count, bg, border, color, desc }) => (
          <div
            key={key}
            className="kpi-card"
            style={{
              background: bg, border: `1px solid ${border}`, cursor: 'pointer',
              outline: filter === key ? `2px solid ${color}` : undefined
            }}
            onClick={() => { setFilter(filter === key ? 'All' : key); setPage(1); }}
          >
            <div className="kpi-value" style={{ color }}>{count}</div>
            <div className="kpi-label" style={{ color }}>{label}</div>
            <div className="kpi-support">{desc}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="card section-mb">
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div className="filter-tabs">
            {['All', 'EXPIRED', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => { setFilter(f); setPage(1); }}>
                {f} ({counts[f] ?? 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Inventory Batch Expiry Status</div>
            <div className="card-subtitle">{filtered.length} batches · sorted by {sortKey.replace('_', ' ')}</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('product_id')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Product <SortIcon k="product_id" /></span>
                </th>
                <th className="sortable" onClick={() => toggleSort('batch_id')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Batch <SortIcon k="batch_id" /></span>
                </th>
                <th className="sortable" onClick={() => toggleSort('quantity')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Quantity <SortIcon k="quantity" /></span>
                </th>
                <th className="sortable" onClick={() => toggleSort('expiry_date')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Expiry Date <SortIcon k="expiry_date" /></span>
                </th>
                <th className="sortable" onClick={() => toggleSort('days_remaining')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Days Remaining <SortIcon k="days_remaining" /></span>
                </th>
                <th>Risk</th>
                <th>Status Bar</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState icon={AlertTriangle} title="No items" text="No inventory batches match this filter." />
                </td></tr>
              ) : paginated.map(item => {
                const urgency = item.days_remaining < 0 ? 100
                  : item.days_remaining <= 3 ? 85
                  : item.days_remaining <= 7 ? 55
                  : Math.max(0, 40 - item.days_remaining);
                const barColor = item.risk === 'EXPIRED' ? 'var(--color-danger)'
                  : item.risk === 'HIGH' ? '#ea580c'
                  : item.risk === 'MEDIUM' ? 'var(--color-warning)'
                  : 'var(--color-success)';

                return (
                  <tr key={`${item.batch_id}`} style={{
                    background: item.risk === 'EXPIRED' ? 'rgba(220,38,38,0.02)'
                      : item.risk === 'HIGH' ? 'rgba(234,88,12,0.02)' : undefined
                  }}>
                    <td><span style={{ fontWeight: 600 }}>{item.product_id}</span></td>
                    <td><span className="td-mono">{item.batch_id}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                    <td className="td-muted">{item.expiry_date?.split('T')[0]}</td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        color: item.risk === 'EXPIRED' ? 'var(--color-danger)'
                          : item.risk === 'HIGH' ? '#ea580c'
                          : item.risk === 'MEDIUM' ? 'var(--color-warning)'
                          : 'var(--color-success)'
                      }}>
                        {item.days_remaining < 0
                          ? `${Math.abs(item.days_remaining)}d expired`
                          : `${item.days_remaining}d left`}
                      </span>
                    </td>
                    <td><StatusBadge risk={item.risk} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 100, height: 6, background: 'var(--color-border-light)',
                          borderRadius: 3, overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%', width: `${urgency}%`,
                            background: barColor, borderRadius: 3,
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="pagination-controls">
              <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
              <button className="page-btn active">{page}</button>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>of {totalPages}</span>
              <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
