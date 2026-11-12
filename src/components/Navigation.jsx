import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

/**
 * Determines whether the current route belongs to the CHR Personnel module.
 * Used by: Navigation component to highlight the active prototype view mode.
 * Connects to: Browser URL route via React Router useLocation().
 * Database table affected: None (UI routing state helper).
 *
 * @param {string} pathname - Current window pathname.
 * @returns {boolean} True if on a CHR route.
 */
function isChrRoute(pathname) {
  return pathname.startsWith('/chr');
}

/**
 * Navigation Component
 * Provides semantic HTML5 header, navigation bar, and sidebar for the 50% prototype.
 * Features an instant prototype role switcher allowing evaluators to toggle between
 * CHR Personnel pages and Bidder pages without authentication or sessions.
 *
 * Scope notice displayed prominently:
 * "Prototype only — authentication and final access control will be implemented in a later development stage."
 *
 * Used by: App.jsx as the primary application layout wrapper.
 * Connects to: Client-side routing.
 * Database table affected: None.
 */
export default function Navigation({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeChr = isChrRoute(location.pathname);
  const isHome = location.pathname === '/';

  /**
   * Switches the active prototype view between CHR Personnel and Bidder modules.
   * Used by: Prototype switcher buttons in the header banner.
   * Connects to: React Router navigate().
   * Database table affected: None.
   *
   * @param {string} role - Target view ('chr' or 'bidder').
   */
  const switchPrototypeView = (role) => {
    if (role === 'chr') {
      navigate('/chr/dashboard');
    } else {
      navigate('/bidder/opportunities');
    }
  };

  return (
    <div>
      {/* Official Top Agency Masthead */}
      <header className="top-gov-bar">
        <div>
          <strong>Republic of the Philippines</strong> &bull; Commission on Human Rights &bull; Regional Office CAR
        </div>
        <div>
          <span style={{ marginRight: '16px', opacity: 0.9 }}>Cordillera Administrative Region</span>
          <span style={{ opacity: 0.8 }}>Procurement Unit &bull; 50% Prototype Submission</span>
        </div>
      </header>

      {/* MANDATORY PROTOTYPE ACCESS CONTROL NOTICE BANNER */}
      <section
        role="region"
        aria-label="Capstone Prototype Scope Notice"
        style={{
          backgroundColor: '#eff6ff',
          borderBottom: '1px solid #bfdbfe',
          padding: '8px 20px',
          fontSize: '12.5px',
          color: '#1e3a8a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }} aria-hidden="true">&#9432;</span>
          <span>
            <strong>Prototype only &mdash; authentication and final access control will be implemented in a later development stage.</strong>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => switchPrototypeView('chr')}
            className={`btn btn-sm ${activeChr ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 12px', fontSize: '12px' }}
          >
            Open CHR Personnel View
          </button>
          <button
            type="button"
            onClick={() => switchPrototypeView('bidder')}
            className={`btn btn-sm ${!activeChr && !isHome ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 12px', fontSize: '12px' }}
          >
            Open Bidder View
          </button>
        </div>
      </section>

      <div className="app-container">
        {/* Semantic Sidebar Navigation */}
        <aside className="sidebar" aria-label="Main Navigation Sidebar">
          {/* Agency Branding */}
          <div className="sidebar-branding">
            <div className="agency-seal">CHR</div>
            <div className="branding-text">
              <h1>CHR-CAR</h1>
              <p>Procurement &amp; Finance</p>
            </div>
          </div>

          {/* Active View Indicator */}
          <div className="sidebar-role-indicator">
            <div className="label">Active Prototype View</div>
            <div className="role-val">
              {isHome ? 'Home / Portal Selector' : activeChr ? 'CHR Personnel' : 'Bidder / Supplier'}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav" aria-label="Portal Navigation Links">
            <div className="nav-section-title">Navigation</div>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              &#8962; Home / Overview
            </NavLink>

            {/* CHR Links if on CHR or Home */}
            {(activeChr || isHome) && (
              <>
                <div className="nav-section-title" style={{ marginTop: '14px' }}>CHR Personnel</div>
                <NavLink
                  to="/chr/dashboard"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/chr/procurements"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Procurement Records
                </NavLink>
                <NavLink
                  to="/chr/procurements/new"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  + Create Procurement
                </NavLink>
                <NavLink
                  to="/chr/bids"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Bids Evaluation
                </NavLink>
                <NavLink
                  to="/chr/financials"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Financial Monitoring
                </NavLink>
                <NavLink
                  to="/chr/history"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Transaction History
                </NavLink>
              </>
            )}

            {/* Bidder Links */}
            {(!activeChr || isHome) && (
              <>
                <div className="nav-section-title" style={{ marginTop: '14px' }}>Bidder / Supplier</div>
                <NavLink
                  to="/bidder/opportunities"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Open Opportunities
                </NavLink>
                <NavLink
                  to="/bidder/submit-bid"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Submit Quotation
                </NavLink>
                <NavLink
                  to="/bidder/my-quotations"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  My Submitted Quotations
                </NavLink>
              </>
            )}

            {/* Quick Switch Buttons */}
            <div className="nav-section-title" style={{ marginTop: '20px' }}>Role Switcher</div>
            {activeChr ? (
              <button
                type="button"
                onClick={() => switchPrototypeView('bidder')}
                className="sidebar-link"
                style={{
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#a7f3d0',
                }}
              >
                Switch to Bidder View &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchPrototypeView('chr')}
                className="sidebar-link"
                style={{
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#a7f3d0',
                }}
              >
                Switch to CHR View &rarr;
              </button>
            )}
          </nav>

          {/* Prototype Footer Inside Sidebar */}
          <div className="sidebar-footer">
            <div style={{ fontWeight: 600, color: '#f8fafc' }}>CHR-CAR Capstone</div>
            <div style={{ opacity: 0.75, fontSize: '11px' }}>50% Core Functions Prototype</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="main-wrapper">
          {/* Semantic Header Bar */}
          <header className="app-header">
            <div className="header-title">
              <h2>Centralized Procurement Tracking and Financial Monitoring System</h2>
              <p>Commission on Human Rights &mdash; Cordillera Administrative Region (CHR-CAR)</p>
            </div>
            <div className="header-controls">
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: isHome ? '#475569' : activeChr ? 'var(--color-primary)' : '#b45309',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {isHome ? 'Overview / Home' : activeChr ? 'Active: CHR Personnel' : 'Active: Bidder / Supplier'}
              </span>
            </div>
          </header>

          {/* Main Semantic Body Viewport */}
          <main className="content-body">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
