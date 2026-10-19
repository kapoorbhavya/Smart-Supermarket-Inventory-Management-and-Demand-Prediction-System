import { useState, useEffect, useMemo } from 'react';
import { Lightbulb, RefreshCw, TrendingUp, AlertTriangle, Package, ShoppingCart } from 'lucide-react';
import { recommendationApi } from '../api/recommendations';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../components/common';

const REC_BADGE = {
  'REORDER': 'badge-danger',
  'SUFFICIENT': 'badge-success',
  'PRIORITIZE EXPIRING STOCK': 'badge-warning',
  'PRIORITIZE EXPIRING STOCK + REORDER': 'badge-danger',
};

const REC_LABEL = {
  'REORDER': 'Reorder',
  'SUFFICIENT': 'Sufficient',
  'PRIORITIZE EXPIRING STOCK': 'Prioritize Expiry',
  'PRIORITIZE EXPIRING STOCK + REORDER': 'Expiry + Reorder',
};

function RecBadge({ rec }) {
  const cls = REC_BADGE[rec] || 'badge-neutral';
  const label = REC_LABEL[rec] || rec;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function Recommendations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recommendationApi.getAll();
      setData(res.data.recommendations || []);
    } catch (err) {
      setError(err.userMessage || 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'All') return data;
    if (filter === 'Reorder') return data.filter(r => r.reorder_quantity > 0);
    if (filter === 'Sufficient') return data.filter(r => r.final_recommendation === 'SUFFICIENT');
    if (filter === 'Expiry') return data.filter(r => r.expiry_risk_quantity > 0);
    return data;
  }, [data, filter]);

  if (loading) return <LoadingState text="Loading AI recommendations..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const reorderCount = data.filter(r => r.reorder_quantity > 0).length;
  const totalUnitsToOrder = data.reduce((s, r) => s + (r.reorder_quantity || 0), 0);
  const expiryRiskCount = data.filter(r => r.expiry_risk_quantity > 0).length;
  const sufficientCount = data.filter(r => r.final_recommendation === 'SUFFICIENT').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, background: 'linear-gradient(135deg, #059669, #84cc16)',
              borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Lightbulb size={20} color="white" />
            </div>
            <div>
              <div className="page-title">AI Inventory Recommendations</div>
              <div className="page-subtitle">Machine learning–based reorder intelligence for {data.length} products</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--spacing-5)' }}>
        {[
          { icon: TrendingUp, value: reorderCount, label: 'Require Reorder', color: 'red', support: 'Products below required stock' },
          { icon: ShoppingCart, value: totalUnitsToOrder.toLocaleString(), label: 'Units to Order', color: 'orange', support: 'Total reorder quantity' },
          { icon: AlertTriangle, value: expiryRiskCount, label: 'Expiry Risk', color: 'orange', support: 'Products with expiring stock' },
          { icon: Package, value: sufficientCount, label: 'Sufficient Stock', color: 'green', support: 'Products with adequate inventory' },
        ].map(({ icon: Icon, value, label, color, support }) => (
          <div key={label} className={`kpi-card ${color}`}>
            <div className="kpi-top">
              <div className={`kpi-icon ${color}`}><Icon size={20} /></div>
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-support">{support}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="card section-mb">
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div className="filter-tabs">
            {[
              { key: 'All', label: `All (${data.length})` },
              { key: 'Reorder', label: `Reorder (${reorderCount})` },
              { key: 'Sufficient', label: `Sufficient (${sufficientCount})` },
              { key: 'Expiry', label: `Expiry Risk (${expiryRiskCount})` },
            ].map(({ key, label }) => (
              <button key={key} className={`filter-tab ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recommendation Details</div>
            <div className="card-subtitle">{filtered.length} products</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>7-Day Demand</th>
                <th>Safety Stock</th>
                <th>Required Stock</th>
                <th>Reorder Qty</th>
                <th>Expiry Risk Qty</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState icon={Lightbulb} title="No recommendations" text="All products appear to be in good shape." />
                </td></tr>
              ) : filtered.map(r => (
                <tr key={r.product_id} style={{
                  background: r.reorder_quantity > 200 ? 'rgba(220,38,38,0.02)' : undefined
                }}>
                  <td>
                    <span className="td-mono" style={{ fontWeight: 600, fontSize: 13 }}>{r.product_id}</span>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: r.current_stock < r.safety_stock ? 'var(--color-danger)' : 'var(--color-text-primary)'
                    }}>
                      {r.current_stock}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.predicted_7_day_demand}</td>
                  <td className="td-muted">{r.safety_stock}</td>
                  <td className="td-muted">{r.required_stock}</td>
                  <td>
                    {r.reorder_quantity > 0 ? (
                      <span style={{
                        fontWeight: 800,
                        color: r.reorder_quantity > 200 ? 'var(--color-danger)' : 'var(--color-warning)',
                        fontSize: 14,
                      }}>
                        +{r.reorder_quantity}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {r.expiry_risk_quantity > 0 ? (
                      <span style={{ fontWeight: 700, color: 'var(--color-warning)' }}>
                        {r.expiry_risk_quantity}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td><RecBadge rec={r.final_recommendation} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
