import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Forecast from './pages/Forecast';
import Recommendations from './pages/Recommendations';
import ExpiryRisk from './pages/ExpiryRisk';

export default function App() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  return (
    <div className="app-shell">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
          },
          success: {
            iconTheme: { primary: '#059669', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
          },
        }}
      />

      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="main-content-area">
        <Header
          pathname={location.pathname}
          onMenuClick={() => setMobileOpen(true)}
          searchValue={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products search={globalSearch} />} />
            <Route path="/inventory" element={<Inventory search={globalSearch} />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/expiry-risk" element={<ExpiryRisk />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
