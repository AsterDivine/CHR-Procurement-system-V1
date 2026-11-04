import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Header Component
 * Displays top navigation bar with CHR-CAR branding,
 * authenticated user profile pill, and logout action.
 */
export default function Header() {
  const navigate = useNavigate();
  const { user, logout, backendOffline, demoLogin } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDemoSwitch = (role) => {
    demoLogin(role);
    if (role === 'chr') {
      navigate('/chr/dashboard');
    } else {
      navigate('/bidder/dashboard');
    }
  };

  return (
    <header className="app-header">
      <div className="header-title">
        <h2>Centralized Procurement &amp; Financial Tracking System</h2>
        <p>Commission on Human Rights &mdash; Cordillera Administrative Region (CHR-CAR)</p>
      </div>

      <div className="header-controls">
        {/* Offline demonstration helper (shown only if backend is not detected or for defense) */}
        {backendOffline && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
          }}>
            <span style={{ color: '#b45309', fontWeight: 600 }}>Demo Mode:</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 8px', fontSize: '11px' }}
              onClick={() => handleDemoSwitch('bidder')}
            >
              Test Bidder
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 8px', fontSize: '11px' }}
              onClick={() => handleDemoSwitch('chr')}
            >
              Test CHR
            </button>
          </div>
        )}

        {user ? (
          <div className="user-badge">
            <div className="user-avatar" style={{
              backgroundColor: user.role === 'chr' ? 'var(--color-primary)' : 'var(--color-secondary)'
            }}>
              {user.role === 'chr' ? 'CP' : 'BD'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {user.role === 'chr'
                  ? 'CHR Personnel (BAC / Procurement)'
                  : (user.organization_name || 'Registered Supplier')}
              </div>
            </div>
            {user.role === 'chr' && (
              <Link
                to="/chr/search"
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: '8px', fontSize: '12px' }}
                title="Global Search"
              >
                🔍 Search
              </Link>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: '8px' }}
              onClick={handleLogout}
              title="End session"
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-secondary btn-sm">
              Register as Bidder
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
