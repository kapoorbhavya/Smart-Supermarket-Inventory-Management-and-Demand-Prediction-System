import { useState, useEffect } from 'react';
import { Search, Bell, Menu } from 'lucide-react';

const PAGE_TITLES = {
  '/': { greeting: 'Store Overview', title: 'Dashboard' },
  '/products': { greeting: 'Product Catalog', title: 'Products' },
  '/inventory': { greeting: 'Inventory Management', title: 'Inventory Batches' },
  '/sales': { greeting: 'Business Analytics', title: 'Sales Analytics' },
  '/forecast': { greeting: 'AI Demand Intelligence', title: 'Demand Forecast' },
  '/recommendations': { greeting: 'Reorder Intelligence', title: 'AI Recommendations' },
  '/expiry-risk': { greeting: 'Expiry Monitoring', title: 'Expiry Risk' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Header({ pathname, onMenuClick, searchValue, onSearchChange }) {
  const info = PAGE_TITLES[pathname] || { greeting: 'Welcome', title: 'Dashboard' };

  return (
    <header className="top-header">
      <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={18} />
      </button>

      <div className="header-left">
        <div className="header-greeting">{getGreeting()} · {info.greeting}</div>
        <div className="header-title">{info.title}</div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search className="header-search-icon" size={15} />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>

        <button className="header-icon-btn" title="Notifications">
          <Bell size={16} />
          <span className="header-notif-badge" />
        </button>

        <div className="header-profile">
          <div className="profile-avatar">SM</div>
          <div className="profile-info">
            <div className="profile-name">Store Manager</div>
            <div className="profile-role">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
