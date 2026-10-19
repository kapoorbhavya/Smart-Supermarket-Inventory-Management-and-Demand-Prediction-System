import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { salesApi } from '../api/sales';
import { LoadingState, ErrorState, ChartCard } from '../components/common';
import { RefreshCw } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#059669','#84cc16','#0284c7','#7c3aed','#d97706','#0d9488','#ec4899','#f43f5e'];

function formatCurrency(val) {
  if (val >= 1000000) return `₹${(val/1000000).toFixed(1)}M`;
  if (val >= 1000) return `₹${(val/1000).toFixed(1)}K`;
  return `₹${Math.round(val)}`;
}

const TooltipBox = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px',
      boxShadow: 'var(--shadow-md)', fontSize: 12
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
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
};

export default function Sales() {
  const [monthly, setMonthly] = useState([]);
  const [category, setCategory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlySalesView, setMonthlySalesView] = useState('revenue');
  const [productView, setProductView] = useState('quantity');
  const [categoryView, setCategoryView] = useState('revenue');

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, cRes, pRes] = await Promise.all([
        salesApi.getMonthly(),
        salesApi.getByCategory(),
        salesApi.getByProduct(),
      ]);

      const monthlyData = (mRes.data.monthly_sales || []).map(m => ({
        month: `${MONTHS[(m._id.month || 1) - 1]} ${m._id.year}`,
        Revenue: Math.round(m.total_revenue || 0),
        Quantity: m.total_quantity || 0,
        _year: m._id.year,
        _month: m._id.month,
      }));
      setMonthly(monthlyData);
      setCategory(cRes.data.category_sales || []);
      setProducts(pRes.data.product_sales || []);
    } catch (err) {
      setError(err.userMessage || 'Failed to load sales data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <LoadingState text="Loading sales analytics..." />;
  if (error) return <ErrorState message={error} onRetry={fetchAll} />;

  // KPI totals from monthly
  const totalRevenue = monthly.reduce((s, m) => s + m.Revenue, 0);
  const totalQuantity = monthly.reduce((s, m) => s + m.Quantity, 0);
  const avgMonthlyRevenue = monthly.length ? totalRevenue / monthly.length : 0;

  // Category chart data
  const categoryChartData = category.map(c => ({
    name: c._id || 'Unknown',
    Revenue: Math.round(c.total_revenue || 0),
    Quantity: c.total_quantity || 0,
  }));

  // Product chart data (top 15)
  const productChartData = products.slice(0, 15).map(p => ({
    name: p.product_name || p._id || '',
    Revenue: Math.round(p.total_revenue || 0),
    Quantity: p.total_quantity || 0,
  }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Sales Analytics</div>
            <div className="page-subtitle">Historical performance across products and categories</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="stats-row">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), bg: '#f0fdf4', color: '#059669' },
          { label: 'Total Units Sold', value: totalQuantity.toLocaleString(), bg: '#f0f9ff', color: '#0284c7' },
          { label: 'Avg Monthly Revenue', value: formatCurrency(avgMonthlyRevenue), bg: '#fdf4ff', color: '#7c3aed' },
          { label: 'Months of Data', value: monthly.length, bg: '#fff7ed', color: '#d97706' },
          { label: 'Product Lines', value: products.length, bg: '#f0fdf4', color: '#059669' },
          { label: 'Categories', value: category.length, bg: '#f0f9ff', color: '#0d9488' },
        ].map(({ label, value, bg, color }) => (
          <div key={label} className="stat-chip" style={{ background: bg }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Chart */}
      <div className="section-mb">
        <ChartCard
          title="Monthly Sales Trend"
          subtitle={`${monthly.length} months of data`}
          actions={
            <div className="filter-tabs">
              <button className={`filter-tab ${monthlySalesView === 'revenue' ? 'active' : ''}`}
                onClick={() => setMonthlySalesView('revenue')}>Revenue</button>
              <button className={`filter-tab ${monthlySalesView === 'quantity' ? 'active' : ''}`}
                onClick={() => setMonthlySalesView('quantity')}>Quantity</button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false}
                interval={monthly.length > 12 ? Math.floor(monthly.length / 12) : 0} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
                tickFormatter={v => monthlySalesView === 'revenue' ? formatCurrency(v) : v.toLocaleString()} />
              <Tooltip content={<TooltipBox />} />
              <Area
                type="monotone"
                dataKey={monthlySalesView === 'revenue' ? 'Revenue' : 'Quantity'}
                name={monthlySalesView === 'revenue' ? 'Revenue' : 'Quantity'}
                stroke="#059669" strokeWidth={2.5}
                fill="url(#mGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#059669' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Category + Product charts */}
      <div className="section-grid-2 section-mb">
        <ChartCard
          title="Category Performance"
          subtitle="Sales by product category"
          actions={
            <div className="filter-tabs">
              <button className={`filter-tab ${categoryView === 'revenue' ? 'active' : ''}`}
                onClick={() => setCategoryView('revenue')}>Revenue</button>
              <button className={`filter-tab ${categoryView === 'quantity' ? 'active' : ''}`}
                onClick={() => setCategoryView('quantity')}>Quantity</button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
                tickFormatter={v => categoryView === 'revenue' ? formatCurrency(v) : v.toLocaleString()} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} width={110} />
              <Tooltip content={<TooltipBox />} />
              <Bar dataKey={categoryView === 'revenue' ? 'Revenue' : 'Quantity'}
                name={categoryView === 'revenue' ? 'Revenue' : 'Quantity'}
                radius={[0, 4, 4, 0]} maxBarSize={24}>
                {categoryChartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Category Revenue Share"
          subtitle="Percentage breakdown"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryChartData}
                dataKey="Revenue"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={90}
                paddingAngle={2}
              >
                {categoryChartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend formatter={v => <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Product Sales Chart */}
      <ChartCard
        title="Top Product Sales"
        subtitle={`Top ${productChartData.length} products by ${productView === 'revenue' ? 'revenue' : 'quantity'}`}
        actions={
          <div className="filter-tabs">
            <button className={`filter-tab ${productView === 'quantity' ? 'active' : ''}`}
              onClick={() => setProductView('quantity')}>Quantity</button>
            <button className={`filter-tab ${productView === 'revenue' ? 'active' : ''}`}
              onClick={() => setProductView('revenue')}>Revenue</button>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={420}>
          <BarChart
            data={[...productChartData].sort((a, b) =>
              (productView === 'revenue' ? b.Revenue - a.Revenue : b.Quantity - a.Quantity)
            )}
            layout="vertical"
            margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => productView === 'revenue' ? formatCurrency(v) : v.toLocaleString()} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} width={130} />
            <Tooltip content={<TooltipBox />} />
            <Bar
              dataKey={productView === 'revenue' ? 'Revenue' : 'Quantity'}
              name={productView === 'revenue' ? 'Revenue' : 'Quantity'}
              fill="#059669" radius={[0, 4, 4, 0]} maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
