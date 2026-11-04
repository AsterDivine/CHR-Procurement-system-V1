import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Sidebar Component
 * Renders agency navigation links dynamically based on the authenticated
 * user's role from AuthContext: 'bidder' or 'chr'.
 */
export default function Sidebar() {
  const { user } = useAuth();
  const currentRole = user?.role;

  return (
    <aside className="sidebar">
      {/* Branding */}
      <div className="sidebar-branding">
        <div className="agency-seal">CHR</div>
        <div className="branding-text">
          <h1>CHR-CAR</h1>
          <p>Procurement &amp; Finance</p>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="sidebar-role-indicator">
        <div className="label">Current Access View</div>
        <div className="role-val">
          {currentRole === 'chr' && 'CHR Personnel'}
          {currentRole === 'bidder' && 'Bidder / Supplier'}
          {!currentRole && 'Public Portal (Guest)'}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {/* CHR Personnel Links */}
        {currentRole === 'chr' && (
          <>
            <div className="nav-section-title">CHR Management</div>
            <NavLink
              to="/chr/dashboard"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/chr/opportunities"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Manage Opportunities
            </NavLink>
            <NavLink
              to="/chr/opportunities/new"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              + Create Opportunity
            </NavLink>
            <NavLink
              to="/chr/transactions"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Procurement Transactions
            </NavLink>
            <NavLink
              to="/chr/budget"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Budget Monitoring
            </NavLink>
            <NavLink
              to="/chr/reports"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Accomplishment Reports
            </NavLink>
            <NavLink
              to="/chr/search"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Global Search
            </NavLink>
            <NavLink
              to="/chr/audit-logs"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Audit Trail
            </NavLink>
          </>
        )}

        {/* Bidder Links */}
        {currentRole === 'bidder' && (
          <>
            <div className="nav-section-title">Bidder Services</div>
            <NavLink
              to="/bidder/dashboard"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Bidder Dashboard
            </NavLink>
            <NavLink
              to="/bidder/opportunities"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Open Opportunities
            </NavLink>
            <NavLink
              to="/bidder/submissions"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              My Submissions
            </NavLink>
            <NavLink
              to="/bidder/profile"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Company Profile
            </NavLink>
          </>
        )}

        {/* Public / Guest Links */}
        {!currentRole && (
          <>
            <div className="nav-section-title">Public Portal</div>
            <NavLink
              to="/login"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Login to System
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              Bidder Registration
            </NavLink>
            <NavLink
              to="/bidder/opportunities"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              View Open Biddings
            </NavLink>
          </>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div>Prototype v1.0 &bull; CHR-CAR</div>
        <div>College Capstone Project</div>
      </div>
    </aside>
  );
}
