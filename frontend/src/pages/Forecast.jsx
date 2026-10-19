import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Brain, Zap, TrendingUp, Calendar, Package, RefreshCw, ChevronDown } from 'lucide-react';
import { forecastApi } from '../api/forecast';
import { LoadingState, ErrorState, EmptyState, ChartCard } from '../components/common';

const COLORS = ['#059669','#84cc16','#0284c7','#7c3aed','#d97706','#0d9488','#ec4899','#f43f5e',
  '#f97316','#14b8a6','#6366f1','#a855f7','#ef4444','#fb923c','#22c55e','#3b82f6',
  '#e11d48','#0ea5e9','#8b5cf6','#10b981','#fbbf24','#64748b','#06b6d4','#7c3aed','#dc2626'];

const TooltipBox = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px',
      boxShadow: 'var(--shadow-md)', fontSize: 12, maxWidth: 220
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Forecast() {
  const [days, setDays] = useState(7);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('All');
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 20;

  const generateForecast = async () => {
    const safeDays = Number(days);
    if (!safeDays || isNaN(safeDays)) {
      setError('Invalid forecast period selected.');
      return;
    }
    setLoading(true);
    setError(null);
    setForecast(null);
    try {
      const res = await forecastApi.getForecast(safeDays);
      if (res.data.status === 'error') throw new Error(res.data.message);
      setForecast(res.data);
      setSelectedProduct('All');
      setTablePage(1);
    } catch (err) {
      // Prefer the user-friendly message set by the Axios interceptor
      setError(err.userMessage || err.message || 'Failed to generate forecast.');
    } finally {
      setLoading(false);
    }
  };

  // Process forecast data for charts
  const forecastItems = forecast?.forecast || [];
  const products = [...new Set(forecastItems.map(f => f.product_id))].sort();
  const dates = [...new Set(forecastItems.map(f => f.date))].sort();

  // Daily total demand chart
  const dailyData = dates.map(date => {
    const dayItems = forecastItems.filter(f => f.date === date);
    const total = dayItems.reduce((s, f) => s + f.predicted_demand, 0);
    return { date: date.slice(5), total };
  });

  // Per-product daily chart (top 5 products by total demand)
  const productTotals = products.map(pid => ({
    pid,
    total: forecastItems.filter(f => f.product_id === pid).reduce((s, f) => s + f.predicted_demand, 0)
  })).sort((a, b) => b.total - a.total);

  const top5 = productTotals.slice(0, 5).map(p => p.pid);

  const productLineData = dates.map(date => {
    const row = { date: date.slice(5) };
    top5.forEach(pid => {
      const item = forecastItems.find(f => f.date === date && f.product_id === pid);
      row[pid] = item?.predicted_demand || 0;
    });
    return row;
  });

  // Table data
  const tableData = forecastItems.filter(f =>
    (selectedProduct === 'All' || f.product_id === selectedProduct) &&
    (!tableSearch || f.product_id.toLowerCase().includes(tableSearch.toLowerCase()) || f.date.includes(tableSearch))
  );
  const tablePaged = tableData.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);
  const tablePages = Math.max(1, Math.ceil(tableData.length / TABLE_PAGE_SIZE));

  const totalDemand = forecastItems.reduce((s, f) => s + f.predicted_demand, 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, background: 'linear-gradient(135deg, #059669, #84cc16)',
                borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Brain size={18} color="white" />
              </div>
              <div className="page-title">AI Demand Forecast</div>
            </div>
            <div className="page-subtitle">
              Predict future product demand using historical sales data and machine learning.
            </div>
          </div>
        </div>
      </div>

      {/* How this works */}
      <div className="info-card section-mb">
        <div className="info-card-header">
          <div className="info-card-icon">
            <Brain size={18} />
          </div>
          <div className="info-card-title">How This Works</div>
        </div>
        <div className="info-card-body">
          {[
            'Historical Sales',
            'Lag Features',
            'Rolling Statistics',
            'Calendar Features',
            'Random Forest Model',
            'Future Demand Prediction',
          ].map((step, i, arr) => (
            <div key={step} className="info-step">
              <span className="info-step-label">{step}</span>
              {i < arr.length - 1 && <span className="info-step-arrow">→</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <strong>Note:</strong> These are statistical predictions based on past trends and do not guarantee future demand.
          Use them as decision-support tools alongside your operational judgment.
        </div>
      </div>

      {/* Forecast Controls */}
      <div className="card section-mb">
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Forecast Period
              </div>
              <div className="forecast-period-btns">
                {[7, 14, 30].map(d => (
                  <button key={d} className={`period-btn ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>
                    {d} Days
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-primary"
              onClick={generateForecast}
              disabled={loading}
              style={{ minWidth: 160 }}
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm" style={{ borderTopColor: 'white' }} />
                  Generating {days}-Day Forecast...
                </>
              ) : (
                <>
                  <Zap size={15} />
                  Generate {days}-Day Forecast
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <LoadingState text={`Generating ${days}-day forecast for all products...`} />
        </div>
      )}

      {/* Error — only shown when not loading */}
      {error && !loading && <ErrorState message={error} onRetry={generateForecast} />}

      {/* Results */}
      {forecast && !loading && (
        <>
          {/* Summary Stats */}
          <div className="stats-row">
            {[
              { label: 'Total Forecasted Demand', value: totalDemand.toLocaleString(), color: '#059669', bg: '#f0fdf4', icon: TrendingUp },
              { label: 'Forecast Period', value: `${forecast.forecast_days} Days`, color: '#0284c7', bg: '#f0f9ff', icon: Calendar },
              { label: 'Products Forecasted', value: products.length, color: '#7c3aed', bg: '#fdf4ff', icon: Package },
              { label: 'Daily Predictions', value: forecast.count, color: '#d97706', bg: '#fff7ed', icon: Brain },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className="stat-chip" style={{ background: bg }}>
                <div style={{
                  width: 38, height: 38, background: `${color}20`,
                  borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color, flexShrink: 0
                }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, marginTop: 2 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Total Chart */}
          <div className="section-mb">
            <ChartCard title="Total Daily Demand Forecast" subtitle="Aggregated predicted demand across all products">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone" dataKey="total" name="Total Demand"
                    stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }}
                    activeDot={{ r: 6, fill: '#059669' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Top Products Lines */}
          <div className="section-mb">
            <ChartCard title="Top 5 Products — Daily Demand" subtitle="Individual product demand by day">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={productLineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend formatter={v => <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{v}</span>} />
                  {top5.map((pid, i) => (
                    <Line key={pid} type="monotone" dataKey={pid} name={pid}
                      stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Product Bar Chart */}
          <div className="section-mb">
            <ChartCard title="Total Forecast by Product" subtitle={`${days}-day aggregate demand per product`}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={productTotals.map(p => ({ name: p.pid, demand: p.total }))}
                  margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="demand" name="Predicted Demand" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Forecast Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Forecast Details</div>
                <div className="card-subtitle">{tableData.length} predictions</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="filter-select" value={selectedProduct}
                  onChange={e => { setSelectedProduct(e.target.value); setTablePage(1); }}>
                  <option value="All">All Products</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{
                      padding: '8px 12px', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-family)',
                      outline: 'none', width: 160
                    }}
                    placeholder="Search..."
                    value={tableSearch}
                    onChange={e => { setTableSearch(e.target.value); setTablePage(1); }}
                  />
                </div>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Date</th>
                    <th>Predicted Demand</th>
                    <th>Demand Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {tablePaged.length === 0 ? (
                    <tr><td colSpan={4}>
                      <EmptyState icon={Brain} title="No data" text="No forecast data matches your filter." />
                    </td></tr>
                  ) : tablePaged.map((f, i) => (
                    <tr key={i}>
                      <td><span className="td-mono">{f.product_id}</span></td>
                      <td className="td-muted">{f.date}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{f.predicted_demand}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            height: 8, borderRadius: 4, background: 'var(--color-primary)',
                            width: `${Math.min(100, (f.predicted_demand / 100) * 100)}%`,
                            minWidth: 4, maxWidth: 120
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tablePages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Page {tablePage} of {tablePages} · {tableData.length} records
                </div>
                <div className="pagination-controls">
                  <button className="page-btn" onClick={() => setTablePage(p => p - 1)} disabled={tablePage === 1}>‹</button>
                  <button className="page-btn active">{tablePage}</button>
                  <button className="page-btn" onClick={() => setTablePage(p => p + 1)} disabled={tablePage === tablePages}>›</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Initial state */}
      {!forecast && !loading && !error && (
        <div className="card">
          <EmptyState
            icon={Brain}
            title="No Forecast Generated"
            text="Select a forecast period and click 'Generate Forecast' to run the AI demand prediction model."
            action={
              <button className="btn btn-primary" onClick={generateForecast}>
                <Zap size={15} /> Generate {days}-Day Forecast
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
