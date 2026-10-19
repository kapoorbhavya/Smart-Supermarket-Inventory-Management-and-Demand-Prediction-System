import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Boxes, TrendingUp, Brain,
  Lightbulb, AlertTriangle, ShoppingCart, Wifi, WifiOff, Loader2
} from 'lucide-react';
import api from '../../api/axios';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: Boxes, label: 'Inventory' },
  { to: '/sales', icon: TrendingUp, label: 'Sales Analytics' },
  { to: '/forecast', icon: Brain, label: 'AI Forecast' },
  { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
  { to: '/expiry-risk', icon: AlertTriangle, label: 'Expiry Risk' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const location = useLocation();
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    const check = async () => {
      try {
        await api.get('/');
        setApiStatus('connected');
      } catch {
        setApiStatus('disconnected');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusLabel = {
    connected: 'Backend Connected',
    disconnected: 'Backend Offline',
    checking: 'Checking...',
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ShoppingCart size={18} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">FreshMart IMS</div>
            <div className="sidebar-logo-subtitle">Inventory Management</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Main Menu</div>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <Icon className="nav-icon" size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <div className={`status-dot ${apiStatus}`} />
            <div className="sidebar-status-text">
              <div className="sidebar-status-label">
                {apiStatus === 'checking' && 'Connecting...'}
                {apiStatus === 'connected' && 'Backend Online'}
                {apiStatus === 'disconnected' && 'Backend Offline'}
              </div>
              <div className="sidebar-status-value">127.0.0.1:8000</div>
            </div>
            {apiStatus === 'checking' && <Loader2 size={14} className="text-muted" style={{ animation: 'spin 1s linear infinite' }} />}
            {apiStatus === 'connected' && <Wifi size={14} color="#10b981" />}
            {apiStatus === 'disconnected' && <WifiOff size={14} color="#dc2626" />}
          </div>
        </div>
      </aside>
    </>
  );
}
