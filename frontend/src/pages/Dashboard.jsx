import { useState, useEffect } from 'react';
import {
  Package, Boxes, ShoppingCart, DollarSign,
  AlertTriangle, Clock, TrendingUp, TrendingDown,
  RefreshCw, ArrowRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { salesApi } from '../api/sales';
import { expiryApi } from '../api/expiry';
import { recommendationApi } from '../api/recommendations';
import {
  KpiCard, ChartCard, LoadingState, ErrorState,
  SkeletonCards, StatusBadge
} from '../components/common';

const CHART_COLORS = ['#059669', '#84cc16', '#0284c7', '#7c3aed', '#d97706', '#0d9488', '#ec4899', '#f43f5e'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatCurrency(val) {
  if (val >= 1000000) return `₹${(val/1000000).toFixed(1)}M`;
  if (val >= 1000) return `₹${(val/1000).toFixed(1)}K`;
  return `₹${Math.round(val)}`;
}

function formatNumber(val) {
  if (val >= 1000000) return `${(val/1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val/1000).toFixed(1)}K`;
  return String(val);
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-md)',
        fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--color-text-primary)' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, display: 'flex', gap: 8 }}>
            <span>{p.name}:</span>
            <span style={{ fontWeight: 600 }}>
              {p.name === 'Revenue' ? formatCurrency(p.value) : p.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [monthlySales, setMonthlySales] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [expiryData, setExpiryData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesView, setSalesView] = useState('revenue');

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, monthlyRes, categoryRes, expiryRes, recRes] = await Promise.all([
        dashboardApi.getSummary(),
        salesApi.getMonthly(),
        salesApi.getByCategory(),
        expiryApi.getExpiryRisk(),
        recommendationApi.getAll(),
      ]);
      setSummary(summaryRes.data);
      const monthly = (monthlyRes.data.monthly_sales || []).map(m => ({
        month: `${MONTHS[(m._id.month || 1) - 1]} ${m._id.year}`,
        Revenue: Math.round(m.total_revenue || 0),
        Quantity: m.total_quantity || 0,
      }));
      setMonthlySales(monthly);
      setCategorySales(categoryRes.data.category_sales || []);
      setExpiryData(expiryRes.data.expiry_risk || []);
      setRecommendations(recRes.data.recommendations || []);
    } catch (err) {
      setError(err.userMessage || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) {
    return (
      <div>
        <SkeletonCards count={6} />
        <LoadingState text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAll} />;
  }

  const expiryCounts = {
    EXPIRED: expiryData.filter(e => e.risk === 'EXPIRED').length,
    HIGH: expiryData.filter(e => e.risk === 'HIGH').length,
    MEDIUM: expiryData.filter(e => e.risk === 'MEDIUM').length,
    LOW: expiryData.filter(e => e.risk === 'LOW').length,
  };

  const urgentExpiry = expiryData
    .filter(e => e.risk === 'EXPIRED' || e.risk === 'HIGH')
    .sort((a, b) => a.days_remaining - b.days_remaining)
    .slice(0, 5);

  const topRecommendations = recommendations
    .filter(r => r.reorder_quantity > 0)
    .sort((a, b) => b.reorder_quantity - a.reorder_quantity)
    .slice(0, 5);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Store Overview</div>
            <div className="page-subtitle">Real-time inventory health and performance metrics</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          icon={Package}
          value={summary?.total_products?.toLocaleString()}
          label="Total Products"
          support="Active product catalog"
          color="green"
        />
        <KpiCard
          icon={Boxes}
          value={formatNumber(summary?.total_inventory_units || 0)}
          label="Inventory Units"
          support="Total stock on hand"
          color="blue"
        />
        <KpiCard
          icon={ShoppingCart}
          value={formatNumber(summary?.total_sales_quantity || 0)}
          label="Total Sales"
          support="Units sold to date"
          color="purple"
        />
        <KpiCard
          icon={DollarSign}
          value={formatCurrency(summary?.total_revenue || 0)}
          label="Total Revenue"
          support="Lifetime revenue"
          color="teal"
        />
        <KpiCard
          icon={TrendingDown}
          value={summary?.products_requiring_reorder}
          label="Reorder Required"
          support="Products below threshold"
          color="orange"
        />
        <KpiCard
          icon={AlertTriangle}
          value={summary?.products_with_expiry_risk}
          label="Expiry Risk"
          support="Products with expiry issues"
          color="red"
        />
      </div>

      {/* Charts Row */}
      <div className="section-grid-2 section-mb">
        {/* Monthly Sales Chart */}
        <ChartCard
          title="Sales Performance"
          subtitle={`Monthly ${salesView === 'revenue' ? 'Revenue' : 'Quantity'} Trend`}
          actions={
            <div className="filter-tabs">
              <button className={`filter-tab ${salesView === 'revenue' ? 'active' : ''}`} onClick={() => setSalesView('revenue')}>Revenue</button>
              <button className={`filter-tab ${salesView === 'quantity' ? 'active' : ''}`} onClick={() => setSalesView('quantity')}>Quantity</button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlySales} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
                tickFormatter={v => salesView === 'revenue' ? formatCurrency(v) : v.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={salesView === 'revenue' ? 'Revenue' : 'Quantity'}
                stroke="#059669"
                strokeWidth={2.5}
                fill="url(#salesGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#059669' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Sales Donut */}
        <ChartCard title="Category Performance" subtitle="Revenue by product category">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categorySales}
                dataKey="total_revenue"
                nameKey="_id"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {categorySales.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Inventory Alerts + Expiry */}
      <div className="section-grid-2 section-mb">
        {/* Expiry Risk Summary */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Expiry Risk Monitor</div>
              <div className="card-subtitle">Inventory batches by expiry status</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expiry-risk')}>
              View All <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Expired', count: expiryCounts.EXPIRED, cls: 'badge-danger', bg: 'var(--color-danger-light)' },
                { label: 'High Risk', count: expiryCounts.HIGH, cls: 'badge-danger', bg: '#fff7ed' },
                { label: 'Medium Risk', count: expiryCounts.MEDIUM, cls: 'badge-warning', bg: 'var(--color-warning-light)' },
                { label: 'Low Risk', count: expiryCounts.LOW, cls: 'badge-success', bg: 'var(--color-success-light)' },
              ].map(({ label, count, cls, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 'var(--radius-md)', padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>{count}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {urgentExpiry.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                  Most Urgent
                </div>
                {urgentExpiry.map(item => (
                  <div key={item.batch_id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid var(--color-border-light)'
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.product_id}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Batch: {item.batch_id} · {item.quantity} units</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <StatusBadge risk={item.risk} />
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {item.days_remaining < 0 ? `${Math.abs(item.days_remaining)}d ago` : `${item.days_remaining}d left`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendations Preview */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">AI Reorder Recommendations</div>
              <div className="card-subtitle">Products requiring immediate attention</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recommendations')}>
              View All <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body">
            {topRecommendations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                ✅ All products sufficiently stocked
              </div>
            ) : (
              topRecommendations.map(r => (
                <div key={r.product_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--color-border-light)'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.product_id}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      Stock: {r.current_stock} · Demand: {r.predicted_7_day_demand}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)' }}>
                      +{r.reorder_quantity}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>units to order</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
