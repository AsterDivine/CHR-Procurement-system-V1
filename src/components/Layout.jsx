import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

/**
 * Layout Component
 * Standard layout wrapper providing government masthead, responsive sidebar,
 * top header bar, and content viewport.
 */
export default function Layout() {
  return (
    <div>
      {/* Official Philippine Government Top Banner */}
      <div className="top-gov-bar">
        <div>
          <strong>Republic of the Philippines</strong> &bull; Commission on Human Rights &bull; Regional Office CAR
        </div>
        <div>
          <span style={{ marginRight: '16px', opacity: 0.85 }}>Cordillera Administrative Region</span>
          <span style={{ opacity: 0.75 }}>Procurement Unit</span>
        </div>
      </div>

      <div className="app-container">
        {/* Dynamic Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="main-wrapper">
          <Header />
          <main className="content-body">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
